import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'ai-social-api',
      now: new Date().toISOString(),
    };
  }
}

