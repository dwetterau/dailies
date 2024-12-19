//
//  EventModel.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import ConvexMobile

struct Event: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let entityId: String
    let date: String
    let details: EventType
}

enum EventType: Codable, Hashable, ConvexEncodable {
    case workout(WorkoutDetails)

    enum CodingKeys: String, CodingKey {
        case type
        case payload
    }

    enum EventTypeKey: String, Codable {
        case workout
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(EventTypeKey.self, forKey: .type)

        switch type {
        case .workout:
            let details = try container.decode(WorkoutDetails.self, forKey: .payload)
            self = .workout(details)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .workout(details):
            try container.encode(EventTypeKey.workout, forKey: .type)
            try container.encode(details, forKey: .payload)
        }
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        switch self {
        case let .workout(details):
            hasher.combine(EventTypeKey.workout)
            hasher.combine(details) // Combine the associated value
        }
    }

    // Equatable conformance
    static func == (lhs: EventType, rhs: EventType) -> Bool {
        switch (lhs, rhs) {
        case let (.workout(details1), .workout(details2)):
            return details1 == details2
        }
    }
}

struct WorkoutOverride: Codable, Hashable {
    let weight: Double
    let repIndex: Int
    let setIndex: Int
}

struct WorkoutDetails: Codable, Hashable {
    let weight: Double
    let numReps: Int
    let numSets: Int
    let overrides: WorkoutOverride?

    static func == (lhs: WorkoutDetails, rhs: WorkoutDetails) -> Bool {
        return lhs.weight == rhs.weight &&
            lhs.numReps == rhs.numReps &&
            lhs.numSets == rhs.numSets &&
            lhs.overrides == rhs.overrides
    }
}
