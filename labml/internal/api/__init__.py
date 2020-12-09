import json
import socket
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from queue import Queue
from typing import Dict, Optional, Callable, List

import labml
from labml import logger
from labml.logger import Text
from labml.utils.notice import labml_notice


@dataclass
class Packet:
    data: Dict[str, any]
    callback: Optional[Callable] = None
    idx: int = -1
    program_completed: bool = False


class _WebApiThread(threading.Thread):
    def __init__(self, url: str, static_attributes: List[str], timeout_seconds: int):
        super().__init__(daemon=False)
        self.timeout_seconds = timeout_seconds
        self.url = url
        self.queue: Queue[Packet] = Queue()
        self.is_stopped = False
        self.errored = False
        self.key_idx = {}
        self.data_idx = 0
        self.static_attributes = static_attributes

    def push(self, packet: Packet):
        for k in packet.data:
            self.key_idx[k] = self.data_idx
        packet.idx = self.data_idx
        self.queue.put(packet)
        self.data_idx += 1

    def stop(self):
        self.is_stopped = True
        self.push(Packet(data={}, program_completed=True))
        logger.log('Still updating LabML App, please wait for it to complete..', Text.highlight)

    def run(self):
        while True:
            packet = self.queue.get()
            if packet.program_completed:
                logger.log('Finished updating LabML App.', Text.highlight)
                return
            else:
                retries = 0
                while True:
                    if self._process(packet):
                        break
                    else:
                        logger.log(f'Retrying again in 10 seconds ({retries})...', Text.highlight)
                        time.sleep(10)
                        retries += 1

    def _process(self, packet: Packet) -> bool:
        data = packet.data
        remove = [k for k in data if k in self.static_attributes and self.key_idx[k] != packet.idx]
        for k in remove:
            del data[k]

        if not data:
            assert packet.callback is None
            return True

        try:
            run_url = self._send(data)
        except urllib.error.HTTPError as e:
            labml_notice([f'Failed to send to {self.url}: ',
                          (str(e.code), Text.value),
                          '\n' + str(e.reason)])
            return False
        except urllib.error.URLError as e:
            labml_notice([f'Failed to connect to {self.url}\n',
                          str(e.reason)])
            return False
        except socket.timeout as e:
            labml_notice([f'{self.url} timeout\n',
                          str(e)])
            return False
        except ConnectionResetError as e:
            labml_notice([f'Connection reset by LabML App server {self.url}\n',
                          str(e)])
            return False

        if packet.callback is not None:
            packet.callback(run_url)

        return True

    def _send(self, data: Dict[str, any]):
        req = urllib.request.Request(self.url)
        req.add_header('Content-Type', 'application/json; charset=utf-8')
        data_json = json.dumps(data)
        data_json = data_json.encode('utf-8')
        req.add_header('Content-Length', str(len(data)))

        response = urllib.request.urlopen(req, data_json, timeout=self.timeout_seconds)
        content = response.read().decode('utf-8')
        result = json.loads(content)

        for e in result.get('errors', []):
            if 'error' in e:
                labml_notice(['LabML App Error: ', (e['error'] + '', Text.key), '\n',
                              (e['message'], Text.value),
                              f'App URL: {self.url}'],
                             is_danger=True)
                self.errored = True
                raise RuntimeError('LabML App Error', e)
            elif 'warning' in e:
                labml_notice(
                    ['LabML App Warning: ', (e['warning'] + ': ', Text.key), (e['message'], Text.value)])
            else:
                self.errored = True
                raise RuntimeError('Unknown error from LabML App', e)

        return result.get('url', None)


class ApiCaller:
    web_api_url: str
    params: Dict[str, str]
    thread: Optional[_WebApiThread]

    def __init__(self, web_api_url: str, params: Dict[str, str],
                 static_attributes: List[str], timeout_seconds: int = 15):
        super().__init__()

        params.copy()
        params['labml_version'] = labml.__version__
        params = '&'.join([f'{k}={v}' for k, v in params.items()])

        self.web_api_url = f'{web_api_url}{params}'
        self.timeout_seconds = timeout_seconds
        self.static_attributes = static_attributes
        self.thread = None

    def push(self, data: Packet):
        if self.thread is None:
            self.thread = _WebApiThread(self.web_api_url, self.static_attributes, self.timeout_seconds)

        if self.thread.errored:
            raise RuntimeError('LabML App error: See above for error details')

        self.thread.push(data)
        if not self.thread.is_alive():
            self.thread.start()

    def stop(self):
        self.thread.stop()
