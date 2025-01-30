class AppTrackConfigs:
    url: str
    frequency: float
    open_browser: bool

    def __init__(self, *,
                 url: str,
                 frequency: float,
                 open_browser: bool,
                 is_default: bool):
        self.is_default = is_default
        self.open_browser = open_browser
        self.frequency = frequency
        self.url = url
