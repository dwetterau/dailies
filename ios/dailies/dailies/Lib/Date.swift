//
//  Date.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import Foundation

enum ResetInterval: String, Codable {
    case daily
    case weekly
}

func getTimeRangeForDate(_ date: Date, resetInterval: ResetInterval) -> (start: Float64, end: Float64) {
    switch resetInterval {
    case .daily:
        return getDayTimeRangeForDate(date)
    case .weekly:
        return getWeekTimeRangeForDate(date)
    }
}

func getWeekTimeRangeForDate(_ date: Date) -> (start: Float64, end: Float64) {
    let calendar = Calendar.current

    // Get the current calendar components
    let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)

    // Create a date from these components, which will be the start of week
    // Note: weekday defaults to the first day of week in user's calendar
    guard let startOfWeek = calendar.date(from: components) else {
        fatalError("could not get start of week for \(date)")
    }

    // Add 7 days to the start of the current week
    // Using Calendar.date(byAdding:) handles DST transitions and calendar system differences
    guard let nextWeek = calendar.date(byAdding: .day, value: 7, to: startOfWeek) else {
        fatalError("could not get start of next week for \(date)")
    }

    return (
        start: Float64(startOfWeek.timeIntervalSince1970 * 1000),
        end: Float64(nextWeek.timeIntervalSince1970 * 1000)
    )
}

// Returns the first millisecond unix TS of the start of the current day, and that of the next day.
func getDayTimeRangeForDate(_ date: Date) -> (start: Float64, end: Float64) {
    // Get the start of the current day in the user's time zone
    let calendar = Calendar.current
    let startOfDay = calendar.startOfDay(for: date)

    // Add 1 day to the current date and get the start of the next day
    let startOfNextDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!

    // Convert the time interval to milliseconds and return it as Int64
    return (
        start: Float64(startOfDay.timeIntervalSince1970 * 1000),
        end: Float64(startOfNextDay.timeIntervalSince1970 * 1000)
    )
}

func isInTimeRange(_ timeRange: (start: Float64, end: Float64), _ timestamp: Int) -> Bool {
    return Float64(timestamp) >= timeRange.start && Float64(timestamp) < timeRange.end
}

func getTimestampFromDate(_ date: Date) -> Int {
    return Int(date.timeIntervalSince1970 * 1000)
}

func getCurrentTimestamp() -> Int {
    return getTimestampFromDate(Date())
}

func getDateFromTimestamp(_ timestamp: Int) -> Date {
    return Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
}

func getDateString(_ date: Date) -> String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "MMM d, yyyy"
    return dateFormatter.string(from: date)
}
