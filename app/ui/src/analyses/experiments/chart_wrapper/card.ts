import {Weya as $, WeyaElement} from '../../../../../lib/weya/weya'
import {Indicator} from "../../../models/run"
import {
    ComparisonPreferenceModel,
} from "../../../models/preferences"
import {getChartType, getSmoother} from "../../../components/charts/utils"
import {LineChart} from "../../../components/charts/lines/chart"
import {SparkLines} from "../../../components/charts/spark_lines/chart"

interface CardWrapperOptions {
    width: number
    series: Indicator[]
    baseSeries?: Indicator[]

    lineChartContainer: WeyaElement
    sparkLinesContainer?: WeyaElement
    elem: WeyaElement

    preferenceData: ComparisonPreferenceModel

    title?: string
}

export class CardWrapper {
    private width: number
    private series: Indicator[]
    private baseSeries: Indicator[]

    private readonly lineChartContainer: WeyaElement
    private readonly sparkLinesContainer?: WeyaElement
    private readonly elem: WeyaElement

    private plotIdx: number[] = []
    private basePlotIdx: number[] = []
    private chartType: number
    private stepRange: number[]
    private focusSmoothed: boolean
    private smoothValue: number
    private smoothFunction: string

    private readonly title?: string

    constructor(opt: CardWrapperOptions) {
        this.elem = opt.elem
        this.width = opt.width
        this.lineChartContainer = opt.lineChartContainer
        this.sparkLinesContainer = opt.sparkLinesContainer
        this.title = opt.title

        this.updateData(opt.series, opt.baseSeries,  opt.preferenceData)
    }

    public updateData(series: Indicator[], baseSeries: Indicator[], preferenceData: ComparisonPreferenceModel) {
        this.series = series
        this.baseSeries = baseSeries ?? []

        this.updatePlotIdxFromSeries(preferenceData)

        this.chartType = preferenceData.chart_type
        this.stepRange = preferenceData.step_range
        this.focusSmoothed = preferenceData.focus_smoothed
        this.smoothValue = preferenceData.smooth_value
        this.smoothFunction = preferenceData.smooth_function

        let [smoothedSeries, smoothedBaseSeries] = getSmoother(this.smoothFunction, {
            indicators: this.series.concat(this.baseSeries ?? []) ?? [],
            smoothValue: this.smoothValue,
            min: this.stepRange[0],
            max: this.stepRange[1],
            currentIndicatorLength: this.series.length
        }).smoothAndTrim()

        this.series = smoothedSeries
        this.baseSeries = smoothedBaseSeries
    }

    public render() {
        if (this.series.length + this.baseSeries.length > 0) {
            this.elem.classList.remove('hide')
            this.renderLineChart()
            this.renderSparkLines()
        } else {
            this.elem.classList.add('hide')
        }
    }

    private renderLineChart() {
        if (this.lineChartContainer == null) {
            return
        }
        this.lineChartContainer.innerHTML = ''
        $(this.lineChartContainer, $ => {
            if (this.title != null) {
                $('span', '.title.text-secondary', this.title)
            }
            new LineChart({
                series: this.series,
                baseSeries: this.baseSeries,
                width: this.width,
                plotIndex: this.plotIdx,
                basePlotIdx: this.basePlotIdx,
                chartType: this.chartType != null ? getChartType(this.chartType) : 'linear',
                isDivergent: true,
                stepRange: this.stepRange,
                focusSmoothed: this.focusSmoothed,
                smoothValue: this.smoothValue
            }).render($)
        })
    }

    private renderSparkLines() {
        if (this.sparkLinesContainer == null) {
            return
        }
        this.sparkLinesContainer.innerHTML = ''
        $(this.sparkLinesContainer, $ => {
            new SparkLines({
                series: this.series,
                baseSeries: this.baseSeries,
                plotIdx: this.plotIdx,
                basePlotIdx: this.basePlotIdx,
                width: this.width,
                isDivergent: true,
                onlySelected: true,
                smoothValue: this.smoothValue,
                isMouseMoveOpt: false
            }).render($)
        })
    }

    private updatePlotIdxFromSeries(preferenceData: ComparisonPreferenceModel) {
        this.plotIdx = []
        for (let i = 0; i < this.series.length; i++) {
            this.plotIdx.push(preferenceData.series_preferences.includes(this.series[i].name) ? 1 : -1)
        }

        if (this.baseSeries) {
            this.basePlotIdx = []
            for (let i = 0; i < this.baseSeries.length; i++) {
                this.basePlotIdx.push(preferenceData.base_series_preferences.includes(this.baseSeries[i].name) ? 1 : -1)
            }
        }
    }
}