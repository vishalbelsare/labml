import {Indicator} from "../../../models/run"
import {Weya as $, WeyaElement} from "../../../../../lib/weya/weya"
import {DeleteButton, SaveButton, ToggleButton} from "../../../components/buttons"
import {LineChart} from "../../../components/charts/lines/chart"
import {SparkLines} from "../../../components/charts/spark_lines/chart"
import {
    getChartType, getSmoother
} from "../../../components/charts/utils"
import {NumericRangeField} from "../../../components/input/numeric_range_field"
import {Loader} from "../../../components/loader"
import {Slider} from "../../../components/input/slider"
import {UserMessages} from "../../../components/user_messages"
import {NetworkError} from "../../../network"
import {SmoothingType} from "../../../components/charts/smoothing/smoothing_base";

interface ViewWrapperOpt {
    dataStore: MetricDataStore
    savePreferences: () => Promise<void>
    requestMissingMetrics: () => Promise<void>
    preferenceChange: () => void
    deleteChart?: () => void
    lineChartContainer: HTMLDivElement
    sparkLinesContainer: HTMLDivElement
    saveButtonContainer: WeyaElement
    optionRowContainer: WeyaElement
    messageContainer: WeyaElement
    actualWidth: number
}

export interface MetricDataStore {
    series: Indicator[]
    baseSeries?: Indicator[]
    plotIdx: number[]
    basePlotIdx?: number[]
    chartType: number
    focusSmoothed: boolean
    stepRange: number[]
    smoothValue: number
    smoothFunction: string

    isUnsaved: boolean
}

abstract class ChangeHandlerBase {
    protected wrapper: ViewWrapper

    constructor(wrapper: ViewWrapper) {
        this.wrapper = wrapper
    }

    change() {
        this.handleChange()
        this.wrapper.onChange()
    }

    protected abstract handleChange(): void
}

namespace ChangeHandlers {
    export class StepChangeHandler extends ChangeHandlerBase {
        private readonly stepRangeField: NumericRangeField

        constructor(wrapper: ViewWrapper) {
            super(wrapper)
            this.stepRangeField = wrapper.stepRangeField
        }

        protected handleChange() {
            let [min, max] = this.stepRangeField.getRange()

            this.wrapper.dataStore.stepRange = [min, max]
        }
    }

    export class ScaleChangeHandler extends ChangeHandlerBase {
        protected handleChange() {
            if (this.wrapper.dataStore.chartType === 1) {
                this.wrapper.dataStore.chartType = 0
            } else {
                this.wrapper.dataStore.chartType = this.wrapper.dataStore.chartType + 1
            }
        }
    }

    export class SmoothFocusChangeHandler extends ChangeHandlerBase {
        protected handleChange() {
            this.wrapper.dataStore.focusSmoothed = !this.wrapper.dataStore.focusSmoothed
        }
    }

    export class SmoothValueHandler extends ChangeHandlerBase {
        private readonly value: number

        constructor(wrapper: ViewWrapper, value: number) {
            super(wrapper)
            this.value = value
        }

        protected handleChange() {
            this.wrapper.dataStore.smoothValue = this.value
        }
    }

    export class SmoothFunctionHandler extends ChangeHandlerBase {
        private readonly value: string

        constructor(wrapper: ViewWrapper, value: string) {
            super(wrapper)
            this.value = value
        }

        protected handleChange() {
            this.wrapper.dataStore.smoothFunction = this.value
        }
    }

    export class ToggleChangeHandler extends ChangeHandlerBase {
        private readonly idx: number
        private readonly isBase: boolean

        constructor(wrapper: ViewWrapper, idx: number, isBase: boolean) {
            super(wrapper)
            this.idx = idx
            this.isBase = isBase
        }

        protected handleChange() {
            let plotIdx = this.isBase ? this.wrapper.dataStore.basePlotIdx : this.wrapper.dataStore.plotIdx

            if (plotIdx[this.idx] > 1)
                plotIdx[this.idx] = 1

            if (plotIdx[this.idx] == 0) {
                plotIdx[this.idx] = 1
            } else if (plotIdx[this.idx] == 1) {
                plotIdx[this.idx] = -1
            } else if (plotIdx[this.idx] == -1) {
                plotIdx[this.idx] = 1
            }

            if (this.isBase) {
                this.wrapper.dataStore.basePlotIdx = plotIdx
            } else {
                this.wrapper.dataStore.plotIdx = plotIdx
            }

            if ((this.isBase && this.wrapper.dataStore.baseSeries[this.idx].is_summary) || (!this.isBase && this.wrapper.dataStore.series[this.idx].is_summary)) {
                // have to load from the backend
                this.wrapper.requestMissingMetrics().then()
            }
        }
    }
}

export class ViewWrapper {
    private readonly lineChartContainer: HTMLDivElement
    private readonly sparkLinesContainer: HTMLDivElement
    private readonly topButtonContainer: WeyaElement
    private readonly optionRowContainer: WeyaElement
    private readonly messageContainer: WeyaElement

    private readonly actualWidth: number

    public readonly stepRangeField: NumericRangeField
    private readonly saveButton: SaveButton
    private readonly scaleButton: ToggleButton
    private readonly focusButton: ToggleButton
    private readonly smoothSlider: Slider
    private readonly deleteButton: DeleteButton
    private readonly leftSmoothButton: ToggleButton
    private sparkLines: SparkLines

    public dataStore: MetricDataStore

    private isLoading: boolean

    private readonly onRequestMissingMetrics: () => Promise<void>
    private readonly savePreferences: () => Promise<void>
    private readonly preferenceChange: () => void
    private readonly onDelete?: () => void

    constructor(opt: ViewWrapperOpt) {
        this.dataStore = opt.dataStore
        this.isLoading = false
        this.lineChartContainer = opt.lineChartContainer
        this.sparkLinesContainer = opt.sparkLinesContainer
        this.topButtonContainer = opt.saveButtonContainer
        this.optionRowContainer = opt.optionRowContainer
        this.messageContainer = opt.messageContainer
        this.actualWidth = opt.actualWidth
        this.onRequestMissingMetrics = opt.requestMissingMetrics
        this.savePreferences = opt.savePreferences
        this.preferenceChange = opt.preferenceChange
        this.onDelete = opt.deleteChart

        this.stepRangeField = new NumericRangeField({
            min: this.dataStore.stepRange[0], max: this.dataStore.stepRange[1],
            onChange: () => {
                let changeHandler = new ChangeHandlers.StepChangeHandler(this)
                changeHandler.change()
            },
            buttonLabel: "Filter Steps"
        })
        this.saveButton = new SaveButton({
            onButtonClick: this.onSave,
            parent: this.constructor.name
        })
        this.scaleButton = new ToggleButton({
            onButtonClick: () => {
                let changeHandler = new ChangeHandlers.ScaleChangeHandler(this)
                changeHandler.change()
            },
            text: 'Log',
            isToggled: this.dataStore.chartType > 0,
            parent: this.constructor.name
        })
        this.focusButton = new ToggleButton({
            onButtonClick: () => {
                let changeHandler = new ChangeHandlers.SmoothFocusChangeHandler(this)
                changeHandler.change()
            },
            text: 'Smoothed',
            isToggled: this.dataStore.focusSmoothed,
            parent: this.constructor.name
        })
        this.smoothSlider = new Slider({
            min: 0,
            max: 1,
            value: this.dataStore.smoothValue,
            step: 0.0001,
            onChange: (value: number) => {
                let changeHandler = new ChangeHandlers.SmoothValueHandler(this, value)
                changeHandler.change()
            },
            hideSlider: true
        })
        this.deleteButton = new DeleteButton({
            parent: this.constructor.name,
            onButtonClick: this.onDelete
        })
        this.leftSmoothButton = new ToggleButton({
            onButtonClick: () => {
                let value: string
                if (this.dataStore.smoothFunction === SmoothingType.LEFT_EXPONENTIAL) {
                    value = SmoothingType.EXPONENTIAL
                } else {
                    value = SmoothingType.LEFT_EXPONENTIAL
                }
                let changeHandler = new ChangeHandlers.SmoothFunctionHandler(this,
                    value)
                changeHandler.change()
            },
            text: 'Left',
            isToggled: this.dataStore.smoothFunction === SmoothingType.LEFT_EXPONENTIAL,
            parent: this.constructor.name
        })
    }

    public clear() {
        this.lineChartContainer.innerHTML = ''
        this.sparkLinesContainer.innerHTML = ''
        this.optionRowContainer.innerHTML = ''
    }

    public renderError(error: Error | NetworkError, message: string) {
        UserMessages.shared.networkError(error, message)
    }

    public render() {
        this.renderCharts()
        this.renderTopButtons()
        this.renderOptionRow()
    }

    // for changes that are not from metrics
    public onNonChartChange() {
        this.dataStore.isUnsaved = true
        this.saveButton.disabled = false
    }

    public onChange() {
        if (!this.isLoading) {
            this.dataStore.isUnsaved = true
            this.renderCharts()
            this.saveButton.disabled = false
        } else {
            this.renderSparkLines()
        }

        this.preferenceChange()
    }

    public async requestMissingMetrics() {
        this.setLoading(true)
        this.saveButton.disabled = true
        try {
            await this.onRequestMissingMetrics()
        } catch (e) {
            UserMessages.shared.networkError(e, "Failed to load metrics")
            return
        } finally {
            this.setLoading(false)
            this.saveButton.disabled = false
        }

        this.renderCharts()
    }

    private onSave = async () => {
        this.saveButton.loading = true
        this.saveButton.disabled = true
        try {
            await this.savePreferences()
            this.dataStore.isUnsaved = false
        } catch (e) {
            UserMessages.shared.networkError(e, "Failed to save preferences")
            return
        } finally {
            this.saveButton.loading = false
            this.dataStore.isUnsaved = false
        }
    }

    private setLoading(isLoading: boolean) {
        if (isLoading && !this.isLoading) {
            $(this.lineChartContainer, $ => {
                $('div', '.chart-overlay', $ => {
                    new Loader().render($)
                })
            })
        } else if (!isLoading) {
            this.smoothSeries()
            this.renderCharts()
        }

        this.isLoading = isLoading
    }

    private smoothSeries() {
        let [series, baseSeries] = getSmoother(this.dataStore.smoothFunction, {
            indicators: this.dataStore.series.concat(this.dataStore.baseSeries ?? []) ?? [],
            smoothValue: this.dataStore.smoothValue,
            min: this.dataStore.stepRange[0],
            max: this.dataStore.stepRange[1],
            currentIndicatorLength: this.dataStore.series.length
        }).smoothAndTrim()

        this.dataStore.series = series
        this.dataStore.baseSeries = baseSeries
    }

    private renderTopButtons() {
        this.saveButton.disabled = !this.dataStore.isUnsaved
        this.topButtonContainer.innerHTML = ''
        $(this.topButtonContainer, $ => {
            if (this.onDelete != null) {
                this.deleteButton.render($)
            }
            this.saveButton.render($)
        })
    }

    private renderCharts() {
        this.smoothSeries()

        this.renderSparkLines()
        this.renderLineChart()
    }

    private renderOptionRow() {
        this.scaleButton.isToggled = this.dataStore.chartType > 0
        this.focusButton.isToggled = this.dataStore.focusSmoothed
        this.smoothSlider.value = this.dataStore.smoothValue
        this.leftSmoothButton.isToggled = this.dataStore.smoothFunction === SmoothingType.LEFT_EXPONENTIAL

        this.optionRowContainer.innerHTML = ''
        this.optionRowContainer.classList.add('input-list-container')
        $(this.optionRowContainer, $ => {
            $('ul', $ => {
                $('li', '', $ => {
                    $('span.item-key', 'Y Scale')
                    this.scaleButton.render($)
                })
                $('li', '.button-row', $ => {
                    $('span.item-key', 'Focus on')
                    this.focusButton.render($)
                })
                $('li', '', $ => {
                    $('span.item-key', 'Step Filter')
                    this.stepRangeField.render($)
                    this.stepRangeField.setRange(this.dataStore.stepRange[0], this.dataStore.stepRange[1])
                })
                $('li', '', $ => {
                    $('span.item-key', 'Smoothing')
                    this.smoothSlider.render($)
                    this.leftSmoothButton.render($)
                })
            })
        })
    }

    private renderLineChart() {
        this.lineChartContainer.innerHTML = ''
        $(this.lineChartContainer, $ => {
            new LineChart({
                series: this.dataStore.series,
                baseSeries: this.dataStore.baseSeries,
                width: this.actualWidth,
                plotIndex: this.dataStore.plotIdx,
                basePlotIdx: this.dataStore.basePlotIdx,
                chartType: getChartType(this.dataStore.chartType),
                onCursorMove: [this.sparkLines.changeCursorValues],
                isCursorMoveOpt: true,
                isDivergent: true,
                stepRange: this.dataStore.stepRange,
                focusSmoothed: this.dataStore.focusSmoothed,
                smoothValue: this.dataStore.smoothValue
            }).render($)
        })
        if (this.isLoading) {
            this.setLoading(true)
        }
    }

    private renderSparkLines() {
        this.sparkLinesContainer.innerHTML = ''
        $(this.sparkLinesContainer, $ => {
            this.sparkLines = new SparkLines({
                series: this.dataStore.series,
                baseSeries: this.dataStore.baseSeries,
                plotIdx: this.dataStore.plotIdx,
                basePlotIdx: this.dataStore.basePlotIdx,
                width: this.actualWidth,
                onSelect: (idx: number) => {
                    let changeHandler = new ChangeHandlers.ToggleChangeHandler(this, idx, false)
                    changeHandler.change()
                },
                onBaseSelect: (idx: number) => {
                    let changeHandler = new ChangeHandlers.ToggleChangeHandler(this, idx, true)
                    changeHandler.change()
                },
                isDivergent: true,
                smoothValue: this.dataStore.smoothValue,
                isMouseMoveOpt: true
            })
            this.sparkLines.render($)
        })
    }
}