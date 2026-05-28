# Fraisage - Logements anneaux LED dans le Kallax

## Principe

Chaque casier du Kallax reçoit un anneau NeoPixel WS2812B 12 LEDs. Pour l'intégrer proprement dans
la paroi ou la porte, un logement circulaire est fraisé à la défonceuse avec une bague de copiage
et un gabarit imprimé en 3D.

## Matériel

| Outil | Référence |
|---|---|
| Défonceuse | PARKSIDE POF 1200 ou Einhell TE-RO 1255 E (compatibles) |
| Bague de copiage | Imprimée en 3D - voir `3d/` |
| Gabarit anneau LED | `3d/gabarit_anneau_led.3mf` |
| Fraise | Fraise droite Ø selon logement anneau |

## Fichiers 3D

Les fichiers sont dans le répertoire [`3d/`](../../3d/) :

| Fichier | Description |
|---|---|
| `gabarit_anneau_led.3mf` | Gabarit de guidage pour fraiser le logement de l'anneau LED |
| `Guide_Bushing_30mm_Einhell_Router_TE-RO_1255_E.3mf` | Bague de copiage 30 mm pour Einhell TE-RO 1255 E |

Bague de copiage PARKSIDE POF 1200 : [modèle Printables](https://www.printables.com/model/556732-copy-ring-for-parkside-pof-1200-d3-router/files)

## Procédure

1. Imprimer le gabarit `gabarit_anneau_led.3mf` et la bague de copiage adaptée à la défonceuse.
2. Fixer le gabarit sur la paroi du casier (serre-joints ou double face fort).
3. Monter la bague de copiage sur la semelle de la défonceuse.
4. Fraiser en plusieurs passes (profondeur max 3–4 mm par passe dans le panneau Kallax).
5. Nettoyer les copeaux, tester le fit de l'anneau avant collage.

## Notes

- Les panneaux Kallax sont en **aggloméré de particules** avec un placage mélaminé : la fraise
  attaque facilement mais l'arrachement est possible en bord si la vitesse d'avance est trop élevée.
  Préférer une vitesse de rotation élevée et une avance lente.
- Pré-percer un trou de dégagement pour le câble de l'anneau avant de fraiser le logement.
