document.addEventListener("DOMContentLoaded", () => {
  // 保存された値を読み込む
  chrome.storage.sync.get("prefix", (data) => {
    document.getElementById("prefix").value = data.prefix || "ukulele";
  });

  // 保存ボタンの処理
  document.getElementById("save").addEventListener("click", () => {
    const prefix = document.getElementById("prefix").value.trim();
    chrome.storage.sync.set({ prefix }, () => {
      alert("保存しました: " + prefix);
    });
  });
});
