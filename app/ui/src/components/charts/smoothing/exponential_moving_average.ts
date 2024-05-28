import {SeriesSmoothing} from "./smoothing_base"
import {PointValue} from "../../../models/run"

export class ExponentialMovingAverage extends SeriesSmoothing {
    protected smooth(): void {
        let smoothingFactor = this.smoothValue

        if (smoothingFactor <= 0) {
            smoothingFactor = 0
        }
        if (smoothingFactor >= 1) {
            smoothingFactor = 1
        }

        for (let i = 0; i < this.indicators.length; i++) {
            let ind = this.indicators[i]

            if (ind.series.length < 2) {
                continue
            }

            let result: PointValue[] = []

            let f_sum: number[] = []
            let f_weights: number[] = []

            let last_sum = 0
            let last_weight = 0
            let last_step = ind.series[0].step

            for (let j = 0; j < ind.series.length; j++) {
                let smooth_gap = Math.pow(smoothingFactor, Math.abs(ind.series[j].step - last_step))
                f_sum.push(last_sum * smooth_gap + ind.series[j].value)
                f_weights.push(last_weight * smooth_gap + 1)

                last_sum = f_sum[j]
                last_weight = f_weights[j]
                last_step = ind.series[j].step
            }

            for (let j = 0; j < ind.series.length; j++) {
                let smoothed = f_sum[j] / f_weights[j]
                result.push({step: ind.series[j].step, value: ind.series[j].value,
                    smoothed: smoothed, lastStep: ind.series[j].lastStep})
            }

            ind.series = result
        }
    }
}