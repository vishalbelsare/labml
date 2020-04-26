from typing import Optional, Set, Dict, List, Union

import numpy as np
import torch

from lab.internal.experiment import \
    create_experiment as _create_experiment, \
    experiment_singleton as _experiment_singleton
from lab.internal.experiment.pytorch import add_models as _add_models
from lab.configs import BaseConfigs


def save_checkpoint():
    _experiment_singleton().save_checkpoint()


def create(*,
           name: Optional[str] = None,
           python_file: Optional[str] = None,
           comment: Optional[str] = None,
           writers: Set[str] = None,
           ignore_callers: Set[str] = None,
           tags: Optional[Set[str]] = None):
    r"""
    Create an experiment

    Keyword Arguments:
        name (str, optional): name of the experiment
        python_file (str, optional): path of the Python file that
            created the experiment
        comment (str, optional): a short description of the experiment
        writers (Set[str], optional): list of writers to write stat to
        ignore_callers: (Set[str], optional): list of files to ignore when
            automatically determining ``python_file``
        tags (Set[str], optional): Set of tags for experiment

    """
    _create_experiment(name=name,
                       python_file=python_file,
                       comment=comment,
                       writers=writers,
                       ignore_callers=ignore_callers,
                       tags=tags)


def add_pytorch_models(models: Dict[str, torch.nn.Module]):
    """
    Set variables for saving and loading

    Arguments:
        models (Dict[str, torch.nn.Module]): a dictionary of torch modules
            used in the experiment. These will be saved with :func:`lab.logger.save_checkpoint`
            and loaded with :meth:`lab.experiment.Experiment.start`.

    """
    _add_models(models)


def calculate_configs(
        configs: Optional[BaseConfigs],
        configs_dict: Dict[str, any] = None,
        run_order: Optional[List[Union[List[str], str]]] = None):
    r"""
    Calculate configurations

    Arguments:
        configs (Configs, optional): configurations object
        configs_dict (Dict[str, any], optional): a dictionary of
            configs to be overridden
        run_order (List[Union[str, List[str]]], optional): list of
            configs to be calculated and the order in which they should be
            calculated. If ``None`` all configs will be calculated.
    """
    _experiment_singleton().calc_configs(configs, configs_dict, run_order)


def start():
    r"""
    Start the experiment.
    """
    _experiment_singleton().start()


def load(run_uuid: str,
         checkpoint: Optional[int] = None):
    r"""
    Start the experiment from a previous checkpoint.

    Keyword Arguments:
        run_uuid (str): if provided the experiment will start from
            a saved state in the run with UUID ``run_uuid``
        checkpoint (str, optional): if provided the experiment will start from
            given checkpoint. Otherwise it will start from the last checkpoint.
    """
    _experiment_singleton().start(run_uuid=run_uuid, checkpoint=checkpoint)


def save_numpy(name: str, array: np.ndarray):
    """
    Save a single numpy array.
    This is used to save processed data
    """
    numpy_path = _experiment_singleton().run.numpy_path

    if not numpy_path.exists():
        numpy_path.mkdir(parents=True)
    file_name = name + ".npy"
    np.save(str(numpy_path / file_name), array)
