//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import Combine
import SwiftUI

struct Entity: Decodable {
    let _id: String
    let ownerId: String
    let name: String
    // "workout"
    let type: String
}

struct Entities: Decodable {
    let entities: Array<Entity>
}

class EntityModel: ObservableObject {
    @Published
    var entities: Entities = Entities(entities: [])
    
    init() {
        print("Starting to subscribe to entities query")
        Task {
            client.subscribe(to: "entities:list", with: ["type": "workout"], yielding: Entities.self)
                .replaceError(with: Entities(entities: []))
                .receive(on: DispatchQueue.main)
                .assign(to: &$entities)
        }
    }
        
}
