---
description: Crea un worktree local en .worktrees/<nombre> según el argumento recibido.
agent: build
---

Recibes el argumento de /worktree:

$ARGUMENTS

Genera un nombre de worktree a partir de ese argumento:
- El argumento puede venir con o sin espacios (ej: "arreglar bug en vidas").
- Analízalo y redúcelo a un nombre CORTO y representativo de la tarea (ej: "bug-vidas"); no repitas la frase completa.
- Si el argumento viene vacío, pregunta al usuario para qué quiere el worktree antes de crear nada.
- El nombre debe ser válido para git worktree/branch: minúsculas, sin espacios, separado por guiones, sin tildes ni caracteres especiales (~ ^ : ? * [ \ @ { ), sin puntos al inicio y sin terminar en . ni /.

Luego ejecuta EXACTAMENTE este único comando, desde el directorio actual y sin cambiar de directorio:

git worktree add .worktrees/<nombre>

No hagas absolutamente nada más: no uses cd, no crees ramas aparte, no hagas commits, no modifiques archivos, no ejecutes otro comando. Si git reporta un error (ya existe el worktree o la rama), muéstralo y detente.
