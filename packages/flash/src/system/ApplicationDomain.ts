/**
 * `flash.system.ApplicationDomain` — no cliente novo existe um domínio só:
 * todas as classes (do jogo e das bibliotecas exportadas) ficam no registro
 * global de `$class`.
 */
import { $allClassNames, $tryCls, $class } from "../as3";

export class ApplicationDomain {
  static $current: ApplicationDomain | null = null;
  static get currentDomain(): ApplicationDomain { return (ApplicationDomain.$current ??= new ApplicationDomain()); }
  static get MIN_DOMAIN_MEMORY_LENGTH(): number { return 1024; }
  domainMemory: any = null;

  constructor(_parent: ApplicationDomain | null = null) {}

  get parentDomain(): ApplicationDomain | null { return null; }

  getDefinition(name: string): any {
    const c = $tryCls(name);
    if (!c) throw Object.assign(new ReferenceError(`Error #1065: Variable ${name} is not defined.`), { errorID: 1065 });
    return c;
  }
  hasDefinition(name: string): boolean { return !!$tryCls(name); }
  getQualifiedDefinitionNames(): string[] { return $allClassNames(); }
}
$class(ApplicationDomain, "flash.system.ApplicationDomain");
