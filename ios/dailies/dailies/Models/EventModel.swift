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
    let timestamp: Int
    let details: EventType
}

enum EventType: Codable, Hashable, ConvexEncodable {
    case workout(WorkoutDetails)
    case flashCards(FlashCardsDetails)
    case genericCompletion(GenericCompletionDetails)

    enum CodingKeys: String, CodingKey {
        case type
        case payload
    }

    enum EventTypeKey: String, Codable {
        case workout
        case flashCards
        case genericCompletion
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(EventTypeKey.self, forKey: .type)

        switch type {
        case .workout:
            let details = try container.decode(WorkoutDetails.self, forKey: .payload)
            self = .workout(details)
        case .flashCards:
            let details = try container.decode(FlashCardsDetails.self, forKey: .payload)
            self = .flashCards(details)
        case .genericCompletion:
            let details = try container.decode(GenericCompletionDetails.self, forKey: .payload)
            self = .genericCompletion(details)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .workout(details):
            try container.encode(EventTypeKey.workout, forKey: .type)
            try container.encode(details, forKey: .payload)
        case let .flashCards(details):
            try container.encode(EventTypeKey.flashCards, forKey: .type)
            try container.encode(details, forKey: .payload)
        case let .genericCompletion(details):
            try container.encode(EventTypeKey.genericCompletion, forKey: .type)
            try container.encode(details, forKey: .payload)
        }
    }

    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        switch self {
        case let .workout(details):
            hasher.combine(EventTypeKey.workout)
            hasher.combine(details) // Combine the associated value
        case let .flashCards(details):
            hasher.combine(EventTypeKey.flashCards)
            hasher.combine(details)
        case let .genericCompletion(details):
            hasher.combine(EventTypeKey.genericCompletion)
            hasher.combine(details)
        }
    }

    // Equatable conformance
    static func == (lhs: EventType, rhs: EventType) -> Bool {
        switch (lhs, rhs) {
        case let (.workout(details1), .workout(details2)):
            return details1 == details2
        case let (.flashCards(details1), .flashCards(details2)):
            return details1 == details2
        case let (.genericCompletion(details1), .genericCompletion(details2)):
            return details1 == details2
        default:
            return false
        }
    }
}

struct WorkoutWeightOverride: Codable, Hashable {
    let weight: Double
    let repIndex: Int
    let setIndex: Int
}

struct WorkoutDetails: Codable, Hashable {
    let weight: Double?
    let numReps: Int?
    let numSets: Int?
    let durationSeconds: Double?
    let distance: Double?
    let weightOverrides: WorkoutWeightOverride?

    static func == (lhs: WorkoutDetails, rhs: WorkoutDetails) -> Bool {
        return lhs.weight == rhs.weight &&
            lhs.numReps == rhs.numReps &&
            lhs.numSets == rhs.numSets &&
            lhs.durationSeconds == rhs.durationSeconds &&
            lhs.distance == rhs.distance &&
            lhs.weightOverrides == rhs.weightOverrides
    }
}

struct FlashCardsDetails: Codable, Hashable {
    let numReviewed: Int
    let numCorrect: Int
}

struct GenericCompletionDetails: Codable, Hashable {
    let numCompletions: Int
    let numRequiredCompletions: Int
}
