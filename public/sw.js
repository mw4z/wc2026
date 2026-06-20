/* Web Push service worker for WC2026 reminders.
   Plain JS (served as-is from /sw.js, not processed by Next). */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "توقعات كأس 2026 ⚽";
  const options = {
    body: data.body || "لا تنسَ تسجيل توقعاتك قبل الإغلاق.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    dir: "rtl",
    lang: "ar",
    data: { url: data.url || "/matches" },
  };
  // Only collapse when the payload provides a tag (same tag = update-in-place, with
  // renotify so it re-alerts). WITHOUT a tag we must NOT collapse — otherwise two
  // notifications arriving together would replace each other and one is lost.
  // (renotify requires a tag, so it's only set alongside one.)
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/matches";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
