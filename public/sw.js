self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const title = data.title || "RUANGTARA Notification";
  const options = {
    body: data.body || "Ada pembaruan baru dari sistem skrining.",
    icon: data.icon || "/RUANGTARA.svg",
    badge: "/RUANGTARA.svg",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow("/");
    })
  );
});
