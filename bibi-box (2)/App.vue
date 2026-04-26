<script>
import { ensureLogin, isLoggedIn } from './utils/session.js'
import { fetchMe } from './utils/api.js'
import { refreshTabBadges } from './utils/badges.js'

export default {
  async onLaunch() {
    if (!isLoggedIn()) {
      ensureLogin()
      return
    }

    try {
      await fetchMe()
      await refreshTabBadges()
    } catch (error) {
      console.error('[App:onLaunch]', error)
    }
  },
  async onShow() {
    if (!isLoggedIn()) {
      ensureLogin()
      return
    }

    try {
      await refreshTabBadges()
    } catch (error) {
      console.error('[App:onShow]', error)
    }
  }
}
</script>

<style>
page {
  background-color: #f6f7f8;
}
</style>
