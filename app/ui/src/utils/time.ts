export function formatTime(time: number): string {
    let date = new Date(time * 1000)
    let timeStr = `${date.getHours()}:${date.getMinutes()}`
    let dateStr = date.toDateString()

    return `${dateStr} at ${timeStr}`
}


export function getTimeDiff(timestamp: number): string {
    let timeDiff = (Date.now() / 1000 - timestamp / 1000)

    if (timeDiff < 60) {
        return `${Math.round(timeDiff)}s ago`
    } else if (timeDiff < 600) {
        return `${Math.floor(timeDiff / 60)}m and ${Math.round(timeDiff % 60)}s ago`
    } else {
        return formatTime(timestamp / 1000)
    }
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


export function getDateTimeComponents(dateTime: Date): string[] {
    let year = dateTime.getFullYear().toString().substring(2)
    let month = monthNames[dateTime.getMonth()]
    let date = dateTime.getDate().toString()

    let hours = dateTime.getHours().toString()
    let minutes = dateTime.getMinutes().toString()

    return [year, month, date, hours, minutes]
}

export function formatDateTime(dateTime: Date) {
    let date = dateTime.getDate()
    let month = monthNames[dateTime.getMonth()]
    let timeStr = dateTime.toTimeString().substr(0, 8)

    return `${month} ${date},${timeStr}`
}

export function getTimeString(dateTime: Date): string {
    let year = dateTime.getFullYear().toString()
    let month = (dateTime.getMonth() + 1).toString()
    let date = dateTime.getDate().toString()
    let hours = dateTime.getHours().toString()
    let minutes = dateTime.getMinutes().toString()


    while (month.length != 2) {
        month = '0' + month
    }
    while (date.length != 2) {
        date = '0' + date
    }
    while (minutes.length != 2) {
        minutes = '0' + minutes
    }
    while (hours.length != 2) {
        hours = '0' + hours
    }

    return `${year}-${month}-${date}T${hours}:${minutes}`
}