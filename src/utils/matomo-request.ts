import { customAlphabet, nanoid } from 'nanoid';
import browser from 'webextension-polyfill';

const genExtensionId = customAlphabet('1234567890abcdef', 16);

async function postData(url = '', params: URLSearchParams) {
  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
  });

  return response;
}

let { extensionId } = await browser.storage.local.get('extensionId');
if (!extensionId) {
  extensionId = genExtensionId();
  browser.storage.local.set({ extensionId });
}

const getParams = async () => {
  const gaParams = new URLSearchParams();

  const pathname = location.hash.substring(2) || 'background';
  const url = `https://${location.host}.com/${pathname}`;

  gaParams.append('action_name', pathname);
  gaParams.append('idsite', '2');
  gaParams.append('rec', '1');
  gaParams.append('url', encodeURI(url));
  gaParams.append('_id', extensionId);
  gaParams.append('rand', nanoid());
  gaParams.append('ca', '1');
  gaParams.append('h', new Date().getUTCHours().toString());
  gaParams.append('m', new Date().getUTCMinutes().toString());
  gaParams.append('s', new Date().getUTCSeconds().toString());
  gaParams.append('cookie', '0');
  gaParams.append('send_image', '0');
  gaParams.append('dimension1', process.env.release!);

  return gaParams;
};
