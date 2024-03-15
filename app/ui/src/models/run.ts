import {Config, ConfigModel} from "./config"
import {toPointValue} from "../components/charts/utils"

export interface RunModel {
    run_uuid: string
    rank: number
    world_size: number
    other_rank_run_uuids: { [uuid: number]: string }
    name: string
    comment: string
    tags: string[]
    note: string
    start_time: number
    python_file: string
    repo_remotes: string
    commit: string
    commit_message: string
    start_step: number
    is_claimed: boolean
    is_project_run: boolean
    size: number
    size_checkpoints: number
    size_tensorboard: number
    computer_uuid: string
    configs: ConfigModel[]
    stdout: string
    logger: string
    stderr: string
    selected_configs: string[]
    favourite_configs: string[]
    session_id: string
    process_id: string
}

export interface PointValue {
    step: number
    value: number
    smoothed: number
    lastStep: number
}

export interface IndicatorModel {
    name: string
    step: number[]
    value: number[]
    smoothed?: number[]
    mean: number
    is_summary: boolean
    last_step: number[]
}

export class Indicator {
    name : string
    series: PointValue[]
    is_summary: boolean

    constructor(indicator: IndicatorModel) {
        this.name = indicator.name
        this.series = toPointValue(indicator)
        this.is_summary = indicator.is_summary
    }
}

export interface AnalysisDataModel {
    series: IndicatorModel[]
    summary: IndicatorModel[]
}

export class AnalysisData {
    series: Indicator[]
    summary: Indicator[]

    constructor(data: AnalysisDataModel) {
        this.series = []
        for (let s of data.series) {
            this.series.push(new Indicator(s))
        }
        this.summary = []
        if (data.summary != null) {
            for (let s of data.summary) {
                this.summary.push(new Indicator(s))
            }
        }
    }
}

export class Run {
    run_uuid: string
    rank: number
    world_size: number
    other_rank_run_uuids: { [uuid: number]: string }
    name: string
    comment: string
    note: string
    tags: string[]
    start_time: number
    python_file: string
    repo_remotes: string
    commit: string
    commit_message: string
    start_step: number
    is_claimed: boolean
    is_project_run: boolean
    size: number
    size_checkpoints: number
    size_tensorboard: number
    computer_uuid: string
    configs: Config[]
    dynamic: object
    stdout: string
    logger: string
    stderr: string
    selected_configs: string[]
    favourite_configs: string[]
    session_id: string
    process_id: string

    constructor(run: RunModel) {
        this.run_uuid = run.run_uuid
        this.rank = run.rank
        this.world_size = run.world_size
        this.other_rank_run_uuids = run.other_rank_run_uuids
        this.name = run.name
        this.comment = run.comment
        this.note = run.note
        this.tags = run.tags
        this.start_time = run.start_time
        this.python_file = run.python_file
        this.repo_remotes = run.repo_remotes
        this.commit = run.commit
        this.commit_message = run.commit_message
        this.start_step = run.start_step
        this.is_claimed = run.is_claimed
        this.is_project_run = run.is_project_run
        this.size = run.size
        this.size_checkpoints = run.size_checkpoints
        this.size_tensorboard = run.size_tensorboard
        this.computer_uuid = run.computer_uuid
        this.configs = []
        this.favourite_configs = run.favourite_configs ?? []
        this.selected_configs = run.selected_configs ?? []
        for (let c of run.configs) {
            this.configs.push(new Config(c,this.selected_configs.includes(c.key), this.favourite_configs.includes(c.key)))
        }
        this.stdout = run.stdout
        this.logger = run.logger
        this.stderr = run.stderr
        this.session_id = run.session_id
        this.process_id = run.process_id
    }

    public updateConfigs() {
        let updatedConfigs: Config[] = []
        for (let c of this.configs) {
            updatedConfigs.push(new Config(c,this.selected_configs.includes(c.key), this.favourite_configs.includes(c.key)))
        }
        this.configs = updatedConfigs
    }

    public get favouriteConfigs(): Config[] {
        let configs: Config[] = []
        for (let c of this.configs) {
            if (c.isFavourite) {
                configs.push(c)
            }
        }
        return configs
    }
}

