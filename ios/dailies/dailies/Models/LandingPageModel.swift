//
//  LandingPageModel.swift
//  dailies
//
//  Created by David Wetterau on 3/21/25.
//
import Combine
import Observation
import SwiftUI

@Observable class LandingPageModel {
    var homePageModel: HomePageModel?
    var authModel: AuthModel

    init() {
        authModel = AuthModel()
        authModel.start { [weak self] in
            self?.initializeHomePageModel()
        }
    }

    func initializeHomePageModel() {
        if case .authenticated = authModel.authState {
            homePageModel = HomePageModel()
        } else {
            homePageModel = nil
        }
    }

    public func updateHomePageModel() async {
        if let homePageModel = homePageModel {
            await homePageModel.updateEntityListModelIfStale()
        }
    }
}
