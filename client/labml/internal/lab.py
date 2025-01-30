from copy import deepcopy
from pathlib import Path
from typing import Optional, Dict

from labml.logger import Text
from labml.utils import get_caller_file
from labml.utils.notice import labml_notice
from . import util
from .app.configs import AppTrackConfigs
from .util import is_colab, is_kaggle

_CONFIG_FILE_NAME = '.labml.yaml'


def get_app_url_for_handle(handle: str, *, base_url=None):
    if base_url is None:
        import os
        if 'labml_app_url' in os.environ:
            base_url = os.environ['labml_app_url']

    if base_url is None:
        return None

    base_url = base_url.strip()
    if not base_url:
        return None

    if not base_url.startswith('http'):
        raise RuntimeError(f'app_url should be a valid URL: {base_url}')
    if '?' in base_url:
        raise RuntimeError(f'app_url should be a valid URL '
                           f'that does contain any url parameters or \'?\': {base_url}')

    if not base_url.endswith('/'):
        base_url += '/'

    if not handle:
        return f'{base_url}'
    else:
        return f'{base_url}{handle}?'

    # return 'https://domain/api/v1/token/track?'


class LabYamlNotfoundError(RuntimeError):
    pass


class Lab:
    """
    ### Lab

    Lab contains the labml specific properties.
    """
    experiments: Optional[Path]
    data_path: Optional[Path]
    check_repo_dirty: Optional[bool]
    path: Optional[Path]
    app_configs: Optional[AppTrackConfigs]
    configs: Dict

    def __init__(self, path: Optional[Path] = None):
        self.indicators = {}
        self.path = None
        self.check_repo_dirty = None
        self.data_path = None
        self.experiments = None
        self.app_configs = None
        self.configs = self.__default_config()
        self.custom_configs = []
        self.__update_configs()
        self.__current_path = None

        if path is None:
            path = get_caller_file()
            path = Path(path).resolve()

        self.__load_configs(path)

    def get_info(self):
        return {
            'current_path': self.__current_path,
            'configs': deepcopy(self.configs),
        }

    def set_path(self, path: str):
        self.__load_configs(Path(path).resolve())

    def __load_configs(self, path: Path):
        if path == self.__current_path:
            return
        self.__current_path = path
        config_files = self.__load_config_files(path)

        self.configs = self.__default_config()

        if not config_files:
            if not is_colab() and not is_kaggle():
                labml_notice([(".labml.yaml", Text.value),
                              " config file could not be found. Looking in path: ",
                              (str(path), Text.meta)])
                while path.exists() and not path.is_dir():
                    path = path.parent

        for c in config_files:
            self.__merge_configs(c)

        for c in self.custom_configs:
            self.__merge_configs(c)

        if not config_files and self.configs['path'] is None:
            self.configs['path'] = str(path)

        self.__update_configs()

    def __update_configs(self):
        if self.configs['path'] is None:
            self.path = None
            self.experiments = None
            self.data_path = None
        else:
            self.path = Path(self.configs['path'])
            self.data_path = (self.path / self.configs['data_path']).resolve()
            self.experiments = (self.path / self.configs['experiments_path']).resolve()

        self.check_repo_dirty = self.configs['check_repo_dirty']
        self.indicators = self.configs['indicators']
        app_track_url = get_app_url_for_handle('track', base_url=self.configs['app_url'])

        if app_track_url:
            self.app_configs = AppTrackConfigs(url=app_track_url,
                                               frequency=self.configs['app_track_frequency'],
                                               open_browser=self.configs['app_open_browser'],
                                               is_default=False)
        else:
            self.app_configs = None

    def set_configurations(self, configs: Dict[str, any]):
        self.custom_configs.append(configs)
        for c in self.custom_configs:
            self.__merge_configs(c)
        self.__update_configs()

    def __str__(self):
        return f"<Lab path={self.path}>"

    def __repr__(self):
        return str(self)

    @staticmethod
    def __default_config():
        return dict(
            path=None,
            check_repo_dirty=False,
            config_file_path=None,
            data_path='data',
            experiments_path='logs',
            analytics_path='analytics',
            analytics_templates={},
            app_url=None,
            app_track_frequency=0,
            app_open_browser=True,
            indicators=[
                {
                    'class_name': 'Scalar',
                    'is_print': True,
                    'name': '*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'param.*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'grad.*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'module.*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'optim.*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'time.*'
                },
                {
                    'class_name': 'Scalar',
                    'is_print': False,
                    'name': 'hp.*'
                },
            ]
        )

    def __merge_configs(self, c):
        if self.configs['path'] is None and 'config_file_path' in c:
            self.configs['path'] = c['config_file_path']

        for k, v in c.items():
            if k not in self.configs:
                raise RuntimeError(f"Unknown config parameter #{k} in file "
                                   f"{c['config_file_path'] / _CONFIG_FILE_NAME}")
            elif k == 'indicators':
                self.configs[k] += v
            else:
                self.configs[k] = v

    @staticmethod
    def __load_config_files(path: Path):
        configs = []

        while path.exists():
            if path.is_dir():
                config_file = path / _CONFIG_FILE_NAME
                if config_file.is_file():
                    with open(str(config_file)) as f:
                        config = util.yaml_load(f.read())
                        if config is None:
                            config = {}
                        config['config_file_path'] = path
                        configs.append(config)

            if str(path) == path.anchor:
                break

            path = path.parent

        return configs


_internal: Optional[Lab] = None


def lab_singleton() -> Lab:
    global _internal
    if _internal is None:
        _internal = Lab()

    return _internal
