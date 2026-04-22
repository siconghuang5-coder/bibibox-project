import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssetHolding,
  MessageType,
  OrderStatus,
  Prisma,
  Product,
  ProductStatus,
  ProductType,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

@Injectable()
export class CommerceService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketHome(accountId: string) {
    const [wallet, cart, products] = await Promise.all([
      this.ensureWallet(accountId),
      this.prisma.cartItem.findMany({
        where: { accountId },
        include: { product: true },
      }),
      this.prisma.product.findMany({
        where: {
          status: {
            in: [ProductStatus.ACTIVE, ProductStatus.SOLD_OUT],
          },
        },
        include: {
          relatedAccount: {
            include: {
              digitalHuman: true,
            },
          },
        },
        orderBy: [{ productType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    const cartQtyMap = new Map(cart.map((item) => [item.productId, item.quantity]));
    const digitalHumans = products
      .filter((item) => item.productType === ProductType.DIGITAL_HUMAN)
      .map((item) => this.serializeProduct(item, cartQtyMap));
    const gifts = products
      .filter((item) => item.productType === ProductType.GIFT)
      .map((item) => this.serializeProduct(item, cartQtyMap));
    const merch = products
      .filter((item) => item.productType === ProductType.MERCH)
      .map((item) => this.serializeProduct(item, cartQtyMap));

    return {
      wallet: {
        balanceCoins: wallet.balanceCoins,
      },
      cart: this.serializeCart(cart),
      sections: {
        digitalHumans,
        gifts,
        merch,
      },
    };
  }

  async listProducts(accountId: string, productType?: ProductType, query = '') {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { accountId },
    });
    const cartQtyMap = new Map(cartItems.map((item) => [item.productId, item.quantity]));
    const trimmedQuery = query.trim();

    const items = await this.prisma.product.findMany({
      where: {
        ...(productType ? { productType } : {}),
        ...(trimmedQuery
          ? {
              OR: [{ name: { contains: trimmedQuery } }, { subtitle: { contains: trimmedQuery } }],
            }
          : {}),
      },
      include: {
        relatedAccount: {
          include: {
            digitalHuman: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      items: items.map((item) => this.serializeProduct(item, cartQtyMap)),
    };
  }

  async getProductDetail(accountId: string, productId: string) {
    const [product, wallet, cartItem] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          relatedAccount: {
            include: {
              digitalHuman: true,
            },
          },
        },
      }),
      this.ensureWallet(accountId),
      this.prisma.cartItem.findUnique({
        where: {
          accountId_productId: {
            accountId,
            productId,
          },
        },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    return {
      wallet: {
        balanceCoins: wallet.balanceCoins,
      },
      product: this.serializeProduct(product, new Map([[productId, cartItem?.quantity ?? 0]])),
    };
  }

  async getCart(accountId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { accountId },
      include: {
        product: {
          include: {
            relatedAccount: {
              include: {
                digitalHuman: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return this.serializeCart(items);
  }

  async upsertCartItem(accountId: string, input: CheckoutItemInput) {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    this.assertPurchasable(product, input.quantity);

    if (input.quantity <= 0) {
      await this.prisma.cartItem.deleteMany({
        where: {
          accountId,
          productId: input.productId,
        },
      });
    } else {
      await this.prisma.cartItem.upsert({
        where: {
          accountId_productId: {
            accountId,
            productId: input.productId,
          },
        },
        update: {
          quantity: input.quantity,
        },
        create: {
          accountId,
          productId: input.productId,
          quantity: input.quantity,
        },
      });
    }

    return this.getCart(accountId);
  }

  async removeCartItem(accountId: string, cartItemId: string) {
    await this.prisma.cartItem.deleteMany({
      where: {
        id: cartItemId,
        accountId,
      },
    });

    return this.getCart(accountId);
  }

  async rechargeWallet(accountId: string, amountCoins: number) {
    if (!Number.isInteger(amountCoins) || amountCoins <= 0) {
      throw new BadRequestException('充值金额必须是正整数');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWallet(accountId, tx);
      const nextBalance = wallet.balanceCoins + amountCoins;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCoins: nextBalance },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.RECHARGE,
          amount: amountCoins,
          balanceAfter: nextBalance,
          title: '钱包充值',
          description: '小程序测试充值，用于完成平台币购买流程。',
        },
      });

      return {
        balanceCoins: updatedWallet.balanceCoins,
      };
    });
  }

  async checkout(accountId: string, items?: CheckoutItemInput[]) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWallet(accountId, tx);
      const selections = await this.resolveCheckoutSelections(accountId, tx, items);

      if (!selections.length) {
        throw new BadRequestException('购物车为空，无法结算');
      }

      const totalCoins = selections.reduce((sum, item) => sum + item.product.priceCoins * item.quantity, 0);
      if (wallet.balanceCoins < totalCoins) {
        throw new BadRequestException('余额不足，请先充值');
      }

      const paidAt = new Date();
      const order = await tx.order.create({
        data: {
          accountId,
          walletId: wallet.id,
          status: OrderStatus.PAID,
          totalCoins,
          paidAt,
          items: {
            create: selections.map((item) => ({
              productId: item.product.id,
              productName: item.product.name,
              productType: item.product.productType,
              unitCoins: item.product.priceCoins,
              quantity: item.quantity,
              coverUrl: item.product.coverUrl,
              snapshot: {
                slug: item.product.slug,
                subtitle: item.product.subtitle,
                relatedAccountId: item.product.relatedAccountId,
              },
            })),
          },
        },
        include: {
          items: true,
        },
      });

      const nextBalance = wallet.balanceCoins - totalCoins;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCoins: nextBalance,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          orderId: order.id,
          type: WalletTransactionType.PURCHASE,
          amount: -totalCoins,
          balanceAfter: nextBalance,
          title: '商城购买',
          description: `订单 ${order.id} 支付完成`,
        },
      });

      for (const selection of selections) {
        await this.applyPurchasedProduct(tx, accountId, order.id, selection.product, selection.quantity);
      }

      if (!items?.length) {
        await tx.cartItem.deleteMany({
          where: {
            id: {
              in: selections.map((item) => item.cartItemId).filter(Boolean) as string[],
            },
          },
        });
      }

      const savedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: true,
        },
      });

      return {
        wallet: {
          balanceCoins: nextBalance,
        },
        order: this.serializeOrder(savedOrder!),
      };
    });
  }

  async listOrders(accountId: string) {
    const orders = await this.prisma.order.findMany({
      where: { accountId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: orders.map((item) => this.serializeOrder(item)),
    };
  }

  async getAssetsDashboard(accountId: string) {
    const [wallet, holdings, orders, ownedDigitalHumans] = await Promise.all([
      this.ensureWallet(accountId),
      this.prisma.assetHolding.findMany({
        where: { accountId },
        include: {
          product: {
            include: {
              relatedAccount: {
                include: {
                  digitalHuman: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { accountId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.digitalHuman.findMany({
        where: { ownerAccountId: accountId },
        include: { account: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      wallet: {
        balanceCoins: wallet.balanceCoins,
      },
      digitalHumans: ownedDigitalHumans.map((item) => ({
        id: item.id,
        accountId: item.accountId,
        slug: item.slug,
        displayName: item.account.displayName,
        avatarUrl: item.account.avatarUrl,
        tagline: item.account.tagline,
        capabilities: item.capabilities,
      })),
      holdings: holdings.map((item) => this.serializeHolding(item)),
      orders: orders.map((item) => this.serializeOrder(item)),
    };
  }

  private async resolveCheckoutSelections(
    accountId: string,
    tx: Prisma.TransactionClient,
    directItems?: CheckoutItemInput[],
  ) {
    if (directItems?.length) {
      const products = await tx.product.findMany({
        where: {
          id: {
            in: directItems.map((item) => item.productId),
          },
        },
      });
      const productMap = new Map(products.map((item) => [item.id, item]));
      return directItems.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new NotFoundException('结算商品不存在');
        }
        this.assertPurchasable(product, item.quantity);
        return {
          cartItemId: null,
          product,
          quantity: item.quantity,
        };
      });
    }

    const cartItems = await tx.cartItem.findMany({
      where: { accountId },
      include: { product: true },
    });

    return cartItems.map((item) => {
      this.assertPurchasable(item.product, item.quantity);
      return {
        cartItemId: item.id,
        product: item.product,
        quantity: item.quantity,
      };
    });
  }

  private async applyPurchasedProduct(
    tx: Prisma.TransactionClient,
    accountId: string,
    orderId: string,
    product: Product,
    quantity: number,
  ) {
    const nextStock = product.stock == null ? null : product.stock - quantity;
    if (nextStock != null && nextStock < 0) {
      throw new BadRequestException(`${product.name} 库存不足`);
    }

    if (product.stock != null) {
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          status: nextStock === 0 ? ProductStatus.SOLD_OUT : product.status,
        },
      });
    }

    if (product.productType === ProductType.DIGITAL_HUMAN && product.relatedAccountId) {
      const digitalHuman = await tx.digitalHuman.findUnique({
        where: { accountId: product.relatedAccountId },
      });

      if (digitalHuman?.ownerAccountId && digitalHuman.ownerAccountId !== accountId) {
        throw new BadRequestException(`${product.name} 已归属于其他用户`);
      }

      if (digitalHuman) {
        await tx.digitalHuman.update({
          where: { accountId: product.relatedAccountId },
          data: {
            ownerAccountId: accountId,
            isPresale: false,
          },
        });
      }
    }

    const existingHolding = await tx.assetHolding.findFirst({
      where: {
        accountId,
        productId: product.id,
      },
    });

    if (existingHolding) {
      await tx.assetHolding.update({
        where: { id: existingHolding.id },
        data: {
          quantity: existingHolding.quantity + quantity,
          orderId,
          updatedAt: new Date(),
        },
      });
    } else {
      await tx.assetHolding.create({
        data: {
          accountId,
          productId: product.id,
          orderId,
          assetType: this.mapAssetType(product.productType),
          title: product.name,
          subtitle: product.subtitle,
          coverUrl: product.coverUrl,
          quantity,
          metadata: {
            slug: product.slug,
            relatedAccountId: product.relatedAccountId,
          },
        },
      });
    }
  }

  private assertPurchasable(product: Product, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('购买数量必须大于 0');
    }

    if (product.status !== ProductStatus.ACTIVE && product.status !== ProductStatus.SOLD_OUT) {
      throw new BadRequestException(`${product.name} 当前不可购买`);
    }

    if (product.stock != null && product.stock < quantity) {
      throw new BadRequestException(`${product.name} 库存不足`);
    }
  }

  private mapAssetType(productType: ProductType) {
    if (productType === ProductType.DIGITAL_HUMAN) {
      return 'DIGITAL_HUMAN' as const;
    }
    if (productType === ProductType.GIFT) {
      return 'GIFT' as const;
    }
    return 'MERCH' as const;
  }

  private serializeProduct(
    product: Product & {
      relatedAccount?: {
        id: string;
        displayName: string;
        avatarUrl: string | null;
        tagline: string | null;
        digitalHuman?: {
          isPresale: boolean;
          capabilities: Prisma.JsonValue | null;
        } | null;
      } | null;
    },
    cartQtyMap: Map<string, number>,
  ) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      productType: product.productType,
      status: product.status,
      priceCoins: product.priceCoins,
      stock: product.stock,
      coverUrl: product.coverUrl,
      badge: product.badge,
      cartQuantity: cartQtyMap.get(product.id) ?? 0,
      relatedAccount: product.relatedAccount
        ? {
            id: product.relatedAccount.id,
            displayName: product.relatedAccount.displayName,
            avatarUrl: product.relatedAccount.avatarUrl,
            tagline: product.relatedAccount.tagline,
            isPresale: product.relatedAccount.digitalHuman?.isPresale ?? false,
            capabilities: product.relatedAccount.digitalHuman?.capabilities ?? [],
          }
        : null,
    };
  }

  private serializeCart(
    items: Array<
      Prisma.CartItemGetPayload<{
        include: {
          product: true;
        };
      }>
    >,
  ) {
    const totalCoins = items.reduce((sum, item) => sum + item.product.priceCoins * item.quantity, 0);
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          subtitle: item.product.subtitle,
          productType: item.product.productType,
          priceCoins: item.product.priceCoins,
          coverUrl: item.product.coverUrl,
        },
      })),
      totalCoins,
      totalQty,
    };
  }

  private serializeOrder(
    order: Prisma.OrderGetPayload<{
      include: {
        items: true;
      };
    }>,
  ) {
    return {
      id: order.id,
      status: order.status,
      totalCoins: order.totalCoins,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productType: item.productType,
        unitCoins: item.unitCoins,
        quantity: item.quantity,
        coverUrl: item.coverUrl,
      })),
    };
  }

  private serializeHolding(
    holding: AssetHolding & {
      product?: {
        id: string;
        slug: string;
        productType: ProductType;
        relatedAccountId: string | null;
        relatedAccount?: {
          id: string;
          displayName: string;
          avatarUrl: string | null;
        } | null;
      } | null;
    },
  ) {
    return {
      id: holding.id,
      assetType: holding.assetType,
      title: holding.title,
      subtitle: holding.subtitle,
      coverUrl: holding.coverUrl,
      quantity: holding.quantity,
      createdAt: holding.createdAt,
      product: holding.product
        ? {
            id: holding.product.id,
            slug: holding.product.slug,
            productType: holding.product.productType,
            relatedAccountId: holding.product.relatedAccountId,
            relatedAccount: holding.product.relatedAccount
              ? {
                  id: holding.product.relatedAccount.id,
                  displayName: holding.product.relatedAccount.displayName,
                  avatarUrl: holding.product.relatedAccount.avatarUrl,
                }
              : null,
          }
        : null,
    };
  }

  private async ensureWallet(accountId: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    return tx.wallet.upsert({
      where: { accountId },
      update: {},
      create: {
        accountId,
        balanceCoins: 0,
      },
    });
  }
}
