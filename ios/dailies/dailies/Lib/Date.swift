//
//  Date.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import Foundation

func getFormatter() -> ISO8601DateFormatter {
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return isoFormatter
}

func getDateString() -> String {
    return getStringFromDate(Date())
}

func getStringFromDate(_ date: Date) -> String {
    return getFormatter().string(from: date)
}

func getDateFromString(_ string: String) -> Date? {
    return getFormatter().date(from: string)
}
