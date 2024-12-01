//
//  ViewModel.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//
import SwiftUI

import ConvexMobile

let convex = ConvexClient(deploymentUrl: deploymentUrl)

struct Entity: Decodable {
    let _id: String
    let ownerId: String
    let name: String
    // "workout"
    let type: Array<String>
}

class ViewModel: ObservableObject {
    @Published
    var entities: Array<Entity> = []
    
    init() {
        convex.subscribe(to: "entities:list", yielding: Array<Entity>.self)
            .replaceError(with: [])
            .receive(on: DispatchQueue.main)
            .assign(to: &$entities)
    }
        
}
