import { DevTools } from '@effect/experimental';
import { Config, Effect, Layer, Logger } from 'effect';
import { NodeRuntime, NodeSocket } from '@effect/platform-node';

const LogLevelLive = Config.logLevel('LOG_LEVEL').pipe(
  Effect.andThen(level => Logger.minimumLogLevel(level)),
  Layer.unwrapEffect
);

const DevToolsLive = DevTools.layerWebSocket().pipe(
  Layer.provide(NodeSocket.layerWebSocketConstructor)
);

export { DevToolsLive, LogLevelLive, NodeRuntime };
