//
//  EntityWithRecentEvents.swift
//  dailies
//
//  Created by David Wetterau on 12/28/24.
//

import Combine
import SwiftUI

class EventsListViewModel: ObservableObject {
    @Published
    private var events: [Event] = []

    @Published
    public private(set) var loaded: Bool = false

    private var subscriptions = Set<AnyCancellable>()
    private let resetInterval: ResetInterval

    init(entityId: String, resetInterval: ResetInterval) {
        self.resetInterval = resetInterval
        Task {
            client.subscribe(to: "events:list", with: ["entityId": entityId], yielding: [Event].self)
                .handleEvents(receiveCompletion: logCompletionHandlers("events:list"))
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$events)
        }

        $events.dropFirst().sink { [weak self] _ in
            guard let self = self else { return }
            self.loaded = true
        }.store(in: &subscriptions)
    }

    public var currentEvent: Event? {
        let currentTimestamp = getCurrentTimestamp()
        let timeRange = getTimeRangeForDate(
            getDateFromTimestamp(currentTimestamp),
            resetInterval: resetInterval
        )

        let event = events.first { event in
            Float64(event.timestamp) >= timeRange.start &&
                Float64(event.timestamp) < timeRange.end
        }
        return event
    }

    public var mostRecentEvent: Event? {
        var maxTimestampEvent: Event? = nil

        let currentTimestamp = getCurrentTimestamp()
        let timeRange = getTimeRangeForDate(
            getDateFromTimestamp(currentTimestamp),
            resetInterval: resetInterval
        )
        for event in events {
            // We intentionally skip the "current" event
            if Float64(event.timestamp) >= timeRange.start &&
                Float64(event.timestamp) < timeRange.end
            {
                continue
            }
            if maxTimestampEvent == nil {
                maxTimestampEvent = event
            } else {
                if event.timestamp > maxTimestampEvent!.timestamp {
                    maxTimestampEvent = event
                }
            }
        }
        return maxTimestampEvent
    }
}
