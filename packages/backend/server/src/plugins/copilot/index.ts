import './config';

import { ServerFeature } from '../../core/config';
import { FeatureModule } from '../../core/features';
import { PermissionModule } from '../../core/permission';
import { QuotaModule } from '../../core/quota';
import { Plugin } from '../registry';
import {
  CopilotContextResolver,
  CopilotContextRootResolver,
  CopilotContextService,
} from './context';
import { CopilotController } from './controller';
import { ChatMessageCache } from './message';
import { PromptService } from './prompt';
import {
  assertProvidersConfigs,
  CopilotProviderService,
  FalProvider,
  OpenAIProvider,
  PerplexityProvider,
  registerCopilotProvider,
} from './providers';
import {
  CopilotResolver,
  PromptsManagementResolver,
  UserCopilotResolver,
} from './resolver';
import { ChatSessionService } from './session';
import { CopilotStorage } from './storage';
import { CopilotWorkflowExecutors, CopilotWorkflowService } from './workflow';

registerCopilotProvider(FalProvider);
registerCopilotProvider(OpenAIProvider);
registerCopilotProvider(PerplexityProvider);

@Plugin({
  name: 'copilot',
  imports: [FeatureModule, QuotaModule, PermissionModule],
  providers: [
    ChatSessionService,
    CopilotResolver,
    ChatMessageCache,
    UserCopilotResolver,
    PromptService,
    CopilotProviderService,
    CopilotStorage,
    PromptsManagementResolver,
    // workflow
    CopilotWorkflowService,
    ...CopilotWorkflowExecutors,
    // context
    CopilotContextRootResolver,
    CopilotContextResolver,
    CopilotContextService,
  ],
  controllers: [CopilotController],
  contributesTo: ServerFeature.Copilot,
  if: config => {
    if (config.flavor.graphql) {
      return assertProvidersConfigs(config);
    }
    return false;
  },
})
export class CopilotModule {}
