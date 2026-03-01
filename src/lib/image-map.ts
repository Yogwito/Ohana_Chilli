// Maps DB image_url filenames to local asset imports
import bowlHawaianoImg from '@/assets/products/bowl-hawaiano.jpg';
import bowlMediterraneoImg from '@/assets/products/bowl-mediterraneo.jpg';
import bowlVeganoImg from '@/assets/products/bowl-vegano.jpg';
import bowlTropicalImg from '@/assets/products/bowl-tropical.jpg';
import bowlTexmexImg from '@/assets/products/bowl-texmex.jpg';
import bowlAtunImg from '@/assets/products/bowl-atun.jpg';
import burgerClasicaImg from '@/assets/products/burger-clasica.jpg';
import burgerDobleImg from '@/assets/products/burger-doble.jpg';
import burgerChickenImg from '@/assets/products/burger-chicken.jpg';
import burgerMushroomImg from '@/assets/products/burger-mushroom.jpg';
import hotdogClasicoImg from '@/assets/products/hotdog-clasico.jpg';
import hotdogChilliImg from '@/assets/products/hotdog-chilli.jpg';
import hotdogBaconImg from '@/assets/products/hotdog-bacon.jpg';
import papasClasicasImg from '@/assets/products/papas-clasicas.jpg';
import papasChilliImg from '@/assets/products/papas-chilli.jpg';
import papasLoadedImg from '@/assets/products/papas-loaded.jpg';
import mazorcadaClasicaImg from '@/assets/products/mazorcada-clasica.jpg';
import mazorcadaChilliImg from '@/assets/products/mazorcada-chilli.jpg';
import nachosClasicosImg from '@/assets/products/nachos-clasicos.jpg';
import nachosSupremosImg from '@/assets/products/nachos-supremos.jpg';
import bevCocacolaImg from '@/assets/products/bev-cocacola.jpg';
import bevCocacolaZeroImg from '@/assets/products/bev-cocacola-zero.jpg';
import bevSpriteImg from '@/assets/products/bev-sprite.jpg';
import bevFantaImg from '@/assets/products/bev-fanta.jpg';
import bevJugoVerdeImg from '@/assets/products/bev-jugo-verde.jpg';
import bevJugoNaranjaImg from '@/assets/products/bev-jugo-naranja.jpg';
import bevLimonadaImg from '@/assets/products/bev-limonada.jpg';
import bevSmoothieImg from '@/assets/products/bev-smoothie.jpg';
import bevAguaImg from '@/assets/products/bev-agua.jpg';
import bevMineralImg from '@/assets/products/bev-mineral.jpg';

const imageMap: Record<string, string> = {
  'bowl-hawaiano.jpg': bowlHawaianoImg,
  'bowl-mediterraneo.jpg': bowlMediterraneoImg,
  'bowl-vegano.jpg': bowlVeganoImg,
  'bowl-tropical.jpg': bowlTropicalImg,
  'bowl-texmex.jpg': bowlTexmexImg,
  'bowl-atun.jpg': bowlAtunImg,
  'burger-clasica.jpg': burgerClasicaImg,
  'burger-doble.jpg': burgerDobleImg,
  'burger-chicken.jpg': burgerChickenImg,
  'burger-mushroom.jpg': burgerMushroomImg,
  'hotdog-clasico.jpg': hotdogClasicoImg,
  'hotdog-chilli.jpg': hotdogChilliImg,
  'hotdog-bacon.jpg': hotdogBaconImg,
  'papas-clasicas.jpg': papasClasicasImg,
  'papas-chilli.jpg': papasChilliImg,
  'papas-loaded.jpg': papasLoadedImg,
  'mazorcada-clasica.jpg': mazorcadaClasicaImg,
  'mazorcada-chilli.jpg': mazorcadaChilliImg,
  'nachos-clasicos.jpg': nachosClasicosImg,
  'nachos-supremos.jpg': nachosSupremosImg,
  'bev-cocacola.jpg': bevCocacolaImg,
  'bev-cocacola-zero.jpg': bevCocacolaZeroImg,
  'bev-sprite.jpg': bevSpriteImg,
  'bev-fanta.jpg': bevFantaImg,
  'bev-jugo-verde.jpg': bevJugoVerdeImg,
  'bev-jugo-naranja.jpg': bevJugoNaranjaImg,
  'bev-limonada.jpg': bevLimonadaImg,
  'bev-smoothie.jpg': bevSmoothieImg,
  'bev-agua.jpg': bevAguaImg,
  'bev-mineral.jpg': bevMineralImg,
};

export function resolveImage(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) return undefined;
  return imageMap[imageUrl] ?? undefined;
}
