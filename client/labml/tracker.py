from typing import Dict, overload, Optional

from labml.internal.tracker import tracker_singleton as _internal


def set_global_step(global_step: Optional[int]):
    """
    Set the current step for tracking

    Arguments:
        global_step (int): Global step
    """
    _internal().set_global_step(global_step)


def add_global_step(increment_global_step: int = 1):
    """
    Increment the current step for tracking

    Arguments:
        increment_global_step (int, optional): By how much to increment the global step.
            Defaults to ``1`` if not provided.
    """
    _internal().add_global_step(int(increment_global_step))


def get_global_step() -> int:
    """
    Returns current step
    """
    return _internal().global_step


def set_histogram(name: str, is_print: bool = False):
    """
    Set indicator type to be a histogram.
    It will log the tracked values as a histogram.

    Arguments:
        name (str): Name of the indicator
        is_print: (bool, optional): Whether the indicator should be printed in console.
            Defaults to ``False``.
    """
    from labml.internal.tracker.indicators.numeric import Histogram
    _internal().add_indicator(Histogram(name, is_print))


def set_scalar(name: str, is_print: bool = False):
    """
    Set indicator type to be a scalar.
    It will log a scalar of the tracked values.
    If there are multiple values it will log the mean.

    Arguments:
        name (str): Name of the indicator
        is_print: (bool, optional): Whether the indicator should be printed in console.
            Defaults to ``False``.
    """
    from labml.internal.tracker.indicators.numeric import Scalar
    _internal().add_indicator(Scalar(name, is_print))


def _add_dict(values: Dict[str, any]):
    for k, v in values.items():
        _internal().store(k, v)


@overload
def add(values: Dict[str, any]):
    ...


@overload
def add(name: str, value: any):
    ...


@overload
def add(**kwargs: any):
    ...


def add(*args, **kwargs):
    """
    This has multiple overloads

    .. function:: add(values: Dict[str, any])
        :noindex:

    .. function:: add(name: str, value: any)
        :noindex:

    .. function:: add(**kwargs: any)
        :noindex:

    This add tracking information to a temporary queue.
    These will be saved when :func:`labml.tracker.save` is called.

    You should use :func:`labml.tracker.add` to improve performance since
    saving tracking information consumes time.
    Although saving takes negligible amount of time it can add up if called very frequently.

    Arguments:
        values (Dict[str, any]): A dictionary of key-value pairs to track
        name (str): The name of the value to be tracked
        value (any): The value to be tracked
        kwargs: Key-value pairs to track
    """
    if len(args) > 2:
        raise TypeError('tracker.add should be called as add(name, value), add(dictionary) or add(k=v,k2=v2...)')

    if len(args) == 0:
        _add_dict(kwargs)
    elif len(args) == 1:
        if kwargs:
            raise TypeError('tracker.add should be called as add(name, value), add(dictionary) or add(k=v,k2=v2...)')
        if not isinstance(args[0], dict):
            raise TypeError('tracker.add should be called as add(name, value), add(dictionary) or add(k=v,k2=v2...)')
        _add_dict(args[0])
    elif len(args) == 2:
        if kwargs:
            raise TypeError('tracker.add should be called as add(name, value), add(dictionary) or add(k=v,k2=v2...)')
        if not isinstance(args[0], str):
            raise TypeError('tracker.add should be called as add(name, value), add(dictionary) or add(k=v,k2=v2...)')
        _internal().store(args[0], args[1])


@overload
def save():
    ...


@overload
def save(global_step: int):
    ...


@overload
def save(values: Dict[str, any]):
    ...


@overload
def save(name: str, value: any):
    ...


@overload
def save(**kwargs: any):
    ...


@overload
def save(global_step: int, values: Dict[str, any]):
    ...


@overload
def save(global_step: int, name: str, value: any):
    ...


@overload
def save(global_step: int, **kwargs: any):
    ...


def save(*args, **kwargs):
    r"""
    This has multiple overloads

    .. function:: save()
        :noindex:

    .. function:: save(global_step: int)
        :noindex:

    .. function:: save(values: Dict[str, any])
        :noindex:

    .. function:: save(name: str, value: any)
        :noindex:

    .. function:: save(**kwargs: any)
        :noindex:

    .. function:: save(global_step: int, values: Dict[str, any])
        :noindex:

    .. function:: save(global_step: int, name: str, value: any)
        :noindex:

    .. function:: save(global_step: int, **kwargs: any)
        :noindex:

    This saves the tracking information.

    Arguments:
        global_step (int): The current step
        values (Dict[str, any]): A dictionary of key-value pairs to track
        name (str): The name of the value to be tracked
        value (any): The value to be tracked
        kwargs: Key-value pairs to track
    """
    if len(args) > 0 and type(args[0]) == int:
        _internal().set_global_step(args[0])
        args = args[1:]

    if len(args) > 0 or len(kwargs.keys()) > 0:
        add(*args, **kwargs)

    _internal().write()


def new_line():
    r"""
    Prints a new line.

    Equivalent to ``logger.log``, but handles distributed training where only the rank=0
    process is tracking data.
    """
    _internal().new_line()


def namespace(name: str):
    r"""
    Set a namespace for tracking
    """
    return _internal().namespace(name)


def reset():
    r"""
    Reset indicators, for a new experiment
    """
    _internal().reset_store()
