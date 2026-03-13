  あなた:
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "searchModel",
      title: "型番を検索",
      contexts: ["all"]
    });
  });
});


async function getPrefix() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("prefix", (data) => {
      resolve(data.prefix || "ukulele");
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "searchModel") {
    const prefix = await getPrefix(); // 事前に取得

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractInfoAndCopyToClipboard,
      args: [prefix]  // ← 引数として渡す！
    }, async (results) => {
      const model = results[0]?.result?.model;
      if (model) {
        const encodedModel = encodeURIComponent(`${prefix} ${model}`);
        const encodedModel2 = encodeURIComponent(`${prefix} ${model.replace(/[-_]/g, '').trim()}`);
        const urls = [
          `https://www.ebay.com/sch/i.html?_nkw=${encodedModel}+-junk+-mod&_sacat=0&_from=R40&_sop=15&rt=nc&LH_ItemCondition=2`,
          `https://search.rakuten.co.jp/search/mall/${encodedModel}/?s=11&sf=1`,
          `https://www.amazon.co.jp/s?k=${encodedModel}`,
          `https://jp.mercari.com/search?keyword=${encodedModel}&status=on_sale&item_types=mercari`,
          `https://jp.mercari.com/search?keyword=${encodedModel2}&status=on_sale&item_types=mercari`,
          `https://auctions.yahoo.co.jp/search/search?p=${encodedModel}&va=${encodedModel}&is_postage_mode=1&dest_pref_code=13&abatch=1%2C2&b=1&n=50`
        ];
        for (const url of urls) {
          chrome.tabs.create({ url });
        }
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => alert("型番がページタイトルから見つかりませんでした。")
        });
      }
    });
  }
});


function extractInfoAndCopyToClipboard(prefix = "ukulele") {
  const title = document.title;
  const url = window.location.href;
  const selectedText = window.getSelection().toString().trim();

  const excludeList = [
    'dust','blue-ray','ray','pack','japanese', 'string', 'acoustic', 'electric','built', 'multi',
    'guitar', 'guitars', 'guitarist', 'guitarrist','lithium','ion', 'battery', 'batteries','volt'
  ];

  let model = null;
  let source = "";

  // 選択文字列を優先
  if (selectedText){
    model = selectedText;
    source = "選択テキスト";
  }

  // タイトルからの抽出（選択文字列が無効な場合）
  if (!model) {
    const modelMatch = title.match(/([A-Za-z0-9]+-[A-Za-z0-9]+)/);
    if (modelMatch && !excludeList.some(word => modelMatch[1].toLowerCase().includes(word))) {
      model = modelMatch[1];
      source = "タイトル";
    }
  }

  const getLabelValue = (labelText) => {
    const label = Array.from(document.querySelectorAll('dt.ux-labels-values__labels'))
      .find(el => el.textContent.trim().toLowerCase() === labelText.toLowerCase());
    if (label) {
      const valueElement = label.nextElementSibling;
      const span = valueElement?.querySelector('span.ux-textspans');
      return span?.textContent.trim() || null;
    }
    return null;
  };

  const isInvalidValue = (val) => {
    return !val || ["n/a", "not applicable"].includes(val.toLowerCase());
  };

  // MPN / Model Number
  if (!model) {
    let mpn = getLabelValue("mpn");
    if (isInvalidValue(mpn)) {
      mpn = getLabelValue("model number") || getLabelValue("model_number") || getLabelValue("reference number");
      if (!isInvalidValue(mpn)) {
        model = mpn;
        source = "Model Number";
      }
    } else {
      model = mpn;
      source = "MPN";
    }
  }

  // UPC / Unspec Code
  if (!model) {
    let upc = getLabelValue("upc");
    if (isInvalidValue(upc)) {
      upc = getLabelValue("unspec_code");
      if (!isInvalidValue(upc)) {
        model = upc;
        source = "Unspec Code";
      }
    } else {
      model = upc;
      source = "UPC";
    }
  }

  // クリップボードコピー処理
  if (model) {
    const searchTerm = `${prefix} ${model}`;
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}+-junk+-mod&_sacat=0&_from=R40&_sop=15&rt=nc&LH_ItemCondition=2`;
    const textToCopy = `${title || ''}\t${url}\t${ebayUrl}`;

    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      alert(`${source}から見つけた情報をクリップボードにコピーしました:\n\n${textToCopy}`);
    } catch (err) {
      alert("クリップボードへのコピーに失敗しました: " + err);
    }
    document.body.removeChild(textarea);
  }

  return { model };
}

