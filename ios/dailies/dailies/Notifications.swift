//
//  Notifications.swift
//  dailies
//
//  Created by David Wetterau on 1/1/25.
//

import Foundation
import UserNotifications

func setupReminderNotification() {
    requestNotificationPermission { granted in
        guard granted else { return }

        let triggerDate = getNextTriggerDate()
        let content = UNMutableNotificationContent()
        content.title = "Do your dailies!"
        content.body = "Make sure you've done your dailies"
        content.sound = .default

        // Create a trigger to fire at the calculated time
        let trigger = UNCalendarNotificationTrigger(
            dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: triggerDate),
            repeats: false
        )

        // Create a request with a unique identifier
        let request = UNNotificationRequest(identifier: "ReminderNotification", content: content, trigger: trigger)

        // Add the notification request to the UNNotificationCenter
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Error scheduling notification: \(error.localizedDescription)")
            } else {
                print("Notification scheduled for \(triggerDate)")
            }
        }
    }
}

func getNextTriggerDate() -> Date {
    let currentDate = Date()
    let calendar = Calendar.current
    let timeZone = TimeZone.current

    // Get today's date at 11:00 PM in the current time zone
    var components = calendar.dateComponents(in: timeZone, from: currentDate)
    components.hour = 23
    components.minute = 0
    components.second = 0

    guard let elevenPM = calendar.date(from: components) else {
        fatalError("Error calculating 11:00 PM")
    }

    // If 11:00 PM has already passed for today, schedule it for tomorrow
    let triggerDate: Date
    if elevenPM < currentDate {
        // Schedule for tomorrow
        triggerDate = calendar.date(byAdding: .day, value: 1, to: elevenPM)!
    } else {
        triggerDate = elevenPM
    }
    return triggerDate
}

func requestNotificationPermission(_ callback: @escaping (_ granted: Bool) -> Void) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        callback(granted)
    }
}
