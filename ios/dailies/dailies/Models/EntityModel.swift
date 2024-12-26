//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import Combine
import SwiftUI

enum EntityCategory: String, Codable {
    case exercise
    case learning
    case care
    case thinking
    case tidying
}

enum EntityType: String, Codable {
    case workout
    case flashCards
    case hydration
    case journaling
    case prescriptions
}

struct Entity: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let name: String
    let category: EntityCategory
    let type: EntityType
    let isRequiredDaily: Bool
}

let emptyEntity = Entity(_id: "", ownerId: "", name: "", category: .exercise, type: .workout, isRequiredDaily: false)

struct Entities: Decodable {
    let entities: [Entity]
    let entityIdToIsDone: [String: Bool]
}

class EntityModel: ObservableObject {
    @Published
    var entity: Entity = emptyEntity

    @Published
    var events: [Event] = []
    init(entity: Entity) {
        self.entity = entity
        Task {
            client.subscribe(to: "entities:get", with: ["id": entity._id], yielding: Entity.self)
                .handleEvents(receiveCompletion: logHandlers("entities:get"))
                .replaceError(with: emptyEntity)
                .receive(on: DispatchQueue.main)
                .assign(to: &$entity)
            client.subscribe(to: "events:list", with: ["entityId": entity._id], yielding: [Event].self)
                .handleEvents(receiveCompletion: logHandlers("events:list"))
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$events)
        }
    }
}

class EntityListModel: ObservableObject {
    @Published
    var entities: Entities = .init(entities: [], entityIdToIsDone: [:])

    init() {
        let timeRange = getTimeRangeForDate(Date())
        Task {
            client.subscribe(
                to: "entities:list",
                with: [
                    "timeRange": [
                        "startTimestamp": timeRange.start,
                        "endTimestamp": timeRange.end,
                    ],
                ],
                yielding: Entities.self
            )
            .handleEvents(receiveCompletion: logHandlers("entities:list"))
            .replaceError(with: Entities(entities: [], entityIdToIsDone: [:]))
            .receive(on: DispatchQueue.main)
            .assign(to: &$entities)
        }
    }

    public func isEntityDoneToday(entityId: String) -> Bool {
        return entities.entityIdToIsDone[entityId] ?? false
    }

    public func isCategoryDoneToday(category: EntityCategory) -> Bool {
        var isAnyDone = false
        var isRequiredEntityNotDone = false
        for entity in entities.entities {
            if entity.category == category {
                if isEntityDoneToday(entityId: entity._id) {
                    isAnyDone = true
                } else {
                    if entity.isRequiredDaily {
                        isRequiredEntityNotDone = true
                    }
                }
            }
        }
        return isAnyDone && !isRequiredEntityNotDone
    }

    public func getExerciseEntities() -> [Entity] {
        entities.entities.filter { entity in
            entity.category == .exercise
        }
    }

    public func getEntityId(forCategory category: EntityCategory, forType: EntityType) -> String? {
        entities.entities.first(where: { $0.category == category && $0.type == forType })?._id
    }
}
