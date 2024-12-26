//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import Combine
import SwiftUI

struct Entity: Decodable, Hashable {
    let _id: String
    let ownerId: String
    let name: String
    let category: String
    let type: String
}

let emptyEntity = Entity(_id: "", ownerId: "", name: "", category: "", type: "")

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
        let dateString = getDateString()
        Task {
            client.subscribe(to: "entities:list", with: [
                "date": dateString,
            ], yielding: Entities.self)
                .handleEvents(receiveCompletion: logHandlers("entities:list"))
                .replaceError(with: Entities(entities: [], entityIdToIsDone: [:]))
                .receive(on: DispatchQueue.main)
                .assign(to: &$entities)
        }
    }

    public func isEntityDoneToday(entityId: String) -> Bool {
        return entities.entityIdToIsDone[entityId] ?? false
    }

    public func getExerciseEntities() -> [Entity] {
        entities.entities.filter { entity in
            entity.category == "exercise"
        }
    }

    public func getFlashCardEntityId() -> String? {
        entities.entities.first(where: { $0.category == "learning" && $0.type == "flashCards" })?._id
    }

    public func getHydrationEntityId() -> String? {
        entities.entities.first(where: { $0.category == "care" && $0.type == "hydration" })?._id
    }
}
