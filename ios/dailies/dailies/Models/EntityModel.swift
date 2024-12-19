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
                .replaceError(with: emptyEntity)
                .receive(on: DispatchQueue.main)
                .assign(to: &$entity)
            client.subscribe(to: "events:list", with: ["entityId": entity._id], yielding: [Event].self)
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .assign(to: &$events)
        }
    }
}

class EntityListModel: ObservableObject {
    @Published
    var entities: Entities = .init(entities: [])

    init() {
        Task {
            client.subscribe(to: "entities:list", with: ["type": "workout"], yielding: Entities.self)
                .replaceError(with: Entities(entities: []))
                .receive(on: DispatchQueue.main)
                .assign(to: &$entities)
        }
    }
}
