import { NgModule } from '@angular/core';
import { CashmereModule } from '../cashmere.module';
import { GameComponent } from './game.component';
import { NewGameModal } from './new-game/new-game.modal';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { GameReducer } from './game.reducer';
import { EffectsModule } from '@ngrx/effects';
import { GameEffects } from './game.effects';
import { gameFeatureKey } from './game.state';

@NgModule({
  imports: [
    CashmereModule,
    ReactiveFormsModule,
    FormsModule,
    StoreModule.forFeature(gameFeatureKey, GameReducer),
    EffectsModule.forFeature([GameEffects]),
  ],
  declarations: [GameComponent, NewGameModal],
  exports: [GameComponent, NewGameModal],
  entryComponents: [GameComponent, NewGameModal],
})
export class GameModule {}
