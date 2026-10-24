import {createContext, useContext} from 'react';

export type ToneName = 'paper' | 'primary' | 'dark' | 'secondary';

/** The tone of the scene background a box is drawn on (set by SceneBg), so boxes can avoid blending into it. */
export const ToneContext = createContext<ToneName | undefined>(undefined);
export const useTone = () => useContext(ToneContext);
