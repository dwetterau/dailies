//
//  LandingPageModel.swift
//  dailies
//
//  Created by David Wetterau on 3/21/25.
//
import Combine
import SwiftUI

class LandingPageModel: ObservableObject {
    @Published var homePageModel: HomePageModel?
    @Published var authModel = AuthModel()
    private var cancellables = Set<AnyCancellable>()

    init() {
        authModel.$authState.sink { [weak self] authState in
            if case .authenticated = authState {
                self?.homePageModel = HomePageModel()
            }
        }
        .store(in: &cancellables)
        
        authModel.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }.store(in: &cancellables)
        
        homePageModel?.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }.store(in: &cancellables)
    }
    
    public func updateHomePageModel() async {
        if let homePageModel = self.homePageModel {
            await homePageModel.updateEntityListModelIfStale()
        }
    }
}
