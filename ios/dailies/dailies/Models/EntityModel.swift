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
    // "workout"
    let type: String
}

let emptyEntity = Entity(_id: "", ownerId: "", name: "", type: "")

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
                .handleEvents(receiveCompletion: { completion in
                    if case let .failure(error) = completion {
                        // Log the error
                        print("Error logged: \(error.localizedDescription)")
                    } else {
                        print("got response \(completion)")
                    }
                })
                .replaceError(with: emptyEntity)
                .receive(on: DispatchQueue.main)
                .assign(to: &$entity)
            client.subscribe(to: "events:list", with: ["entityId": entity._id], yielding: [Event].self)
                .handleEvents(receiveCompletion: { completion in
                    if case let .failure(error) = completion {
                        // Log the error
                        print("Error logged: \(error.localizedDescription)")
                    } else {
                        print("got response \(completion)")
                    }
                })
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
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let dateString = isoFormatter.string(from: Date())
        Task {
            client.subscribe(to: "entities:list", with: [
                "date": dateString,
            ], yielding: Entities.self)
                .handleEvents(receiveCompletion: { completion in
                    if case let .failure(error) = completion {
                        // Log the error
                        print("Error logged: \(error.localizedDescription)")
                    } else {
                        print("got response \(completion)")
                    }
                })
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
            entity.type == "exercise"
        }
    }

    public func getFlashCardEntityId() -> String? {
        // TODO: We'll need another layer in here - maybe the type needs to be specific and a new category
        // can help define the groups
        entities.entities.first(where: { $0.type == "learning" })?._id
    }
}
