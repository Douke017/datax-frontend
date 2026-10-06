# Guía Oficial de Diseño, Arquitectura y Experiencia de Usuario (Frontend Guidelines)

> **DATAX Compliance & Financial Intelligence Suite**  
> *Versión 1.0 — Documento de Estándar Obligatorio*

---

## 1. Misión y Audiencia

### 1.1 Audiencia Objetivo
El sistema DATAX está diseñado y operado exclusivamente por:
- **Analistas Financieros** de instituciones de microfinanzas y bancos.
- **Supervisores de Riesgo Crediticio y de Mercado**.
- **Auditores de Cumplimiento Normativo** regulados por la Autoridad de Supervisión del Sistema Financiero (ASFI), el Banco Central de Bolivia (BCB) y asociaciones gremiales como FINRURAL.

### 1.2 Principio Rector: Orientación al Negocio
El analista busca evaluar solvencia, monitorear brechas documentales, vigilar índices de mora y comparar el desempeño institucional. **El analista NO es un ingeniero de datos ni un desarrollador de software.**

---

## 2. Reglas Estrictas de Lenguaje y Terminología

### 2.1 Cero Jerga Técnica / Tecnológica en la Interfaz (Zero Leakage)
Está **terminantemente prohibido** exponer conceptos de infraestructura interna, motores de base de datos o arquitectura de almacenamiento en títulos, etiquetas, badges, descripciones, tablas o botones de la interfaz de usuario.

| Término Prohibido (Jerga de Ingeniería) | Término Obligatorio (Dominio Financiero / Negocio) |
| :--- | :--- |
| `DuckDB`, `DuckDB Columnar`, `Vectorizado` | *Motor Analítico*, *Análisis Financiero*, *Consulta Institucional* |
| `Parquet`, `Parquet particionado` | *Registros Contables*, *Estados Financieros Consolidados* |
| `Capa Gold`, `Datamart Gold` | *Módulo de Supervisión Financiera*, *Información Consolidada* |
| `Capa Bronze`, `Filesystem Local` | *Repositorio de Documentos*, *Custodia de Archivos Originales* |
| `Capa Silver` | *Normalización Contable*, *Depuración de Registros* |
| `Pipeline Bronze -> Silver -> Gold`, `ETL` | *Proceso de Cierre Contable*, *Sincronización de Información* |
| `Predicados SQL`, `Query SQL compilado` | *Criterios de Filtrado*, *Parámetros de Auditoría* |
| `Latencia en ms`, `Execution time ms` | *Tiempo de Respuesta*, *Velocidad de Consulta* |

### 2.2 Prohibición Absoluta de Emojis
Los emojis (📊, 📖, 🚀, ✕, ⚠️, etc.) restan seriedad a un entorno financiero y de auditoría institucional.
- **Regla:** Ningún componente, plantilla HTML, texto o mensaje de notificación debe contener emojis.
- **Alternativa:** Usar diseño tipográfico limpio, espaciado armónico, indicadores de estado basados en color (`--success`, `--warning`, `--danger`), o micro-insignias textuales formales (`RESGUARDADO`, `REGULADO`, `AUDITADO`).

### 2.3 Prohibición de Códigos de Historias de Usuario (HUs)
Los códigos de tickets y requerimientos de desarrollo (como `HUI-12`, `HUI-16`, `HUI-21`, `HUI-22`) son artefactos internos del equipo de ingeniería.
- **Regla:** Jamás deben figurar en la UI, ni en subtítulos, ni en tarjetas, ni en nombres de vistas.
- **Alternativa:** Usar nombres formales de negocio:
  - ❌ `Diccionario Semántico (HUI-16)` $\rightarrow$ ✅ `Catálogo Normativo de Indicadores Financieros`
  - ❌ `Vistas Predefinidas (HUI-22)` $\rightarrow$ ✅ `Evaluación de Cartera y Solvencia`

---

## 3. Principio Holístico: "El sistema es más que la suma de sus partes"

### 3.1 Interconexión Orgánica de Componentes
Los módulos de DATAX no son pantallas aisladas:
1. **Auditoría de Publicaciones:** Identifica la disponibilidad de boletines y balances requeridos por ley.
2. **Custodia Documental (Almacén):** Garantiza que los archivos originales estén respaldados con firma de integridad.
3. **Supervisión de Cartera y Solvencia:** Proyecta la información financiera extraída de dichos documentos para diagnosticar la salud de las entidades.
4. **Catálogo Normativo:** Explica la base de cálculo legal y contable de cada métrica utilizada en las pantallas anteriores.

### 3.2 Continuidad de Contexto y Estado Compartido
- Toda pantalla debe respetar y sincronizar el estado institucional (`InstitutionStateService`).
- Si el usuario selecciona o audita una entidad en una sección, la suite debe mantener esa referencia activa cuando el usuario navegue hacia otros análisis.

---

## 4. Estándares Visuales y Numéricos

### 4.1 Formateo Numérico Riguroso
- **Moneda:** Todos los importes en moneda nacional deben llevar formato con separadores de miles y el sufijo oficial: `1.234.567,89 Bs.`
- **Porcentajes:** Los ratios expresados en decimales (ej. `0.0123`) deben multiplicarse y mostrarse en formato estándar porcentual con 2 decimales: `1,23%`.
- **Múltiplos:** Los índices de solvencia y cobertura de previsiones deben expresarse como múltiplos claros: `5,67x`.

### 4.2 Semántica de Colores por Nivel de Riesgo
- **Verde (`--success`):** Indicador saludable, mora baja (< 2,0%), cobertura de previsiones óptima (> 2,0x), documento resguardado.
- **Ámbar (`--warning`):** Zona de precaución, mora moderada (2,0% – 4,0%), documento pendiente de resguardo.
- **Rojo (`--danger`):** Alerta crítica, mora elevada (> 4,0%), documento no localizado o incumplimiento normativo.
- **Azul / Cian (`--primary`, `--info`):** Elementos institucionales, información neutral y filtros activos.
