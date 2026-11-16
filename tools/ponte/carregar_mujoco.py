"""carregar_mujoco.py: conferência manual do MJCF gerado por tools/ponte/mjcf.mjs no MuJoCo, chamado como programa.

Carrega o arquivo, diz a versão do MuJoCo, os corpos, as juntas e a massa total, a massa e o centro de massa de cada
conjunto na pose zero (em g e mm, para comparar com a ficha), solta as juntas de um ângulo inicial sob a gravidade e
diz o ângulo de cada junta ao fim dos passos. Sai com erro se o MuJoCo recusar o modelo, avisar durante os passos ou o estado virar NaN.
Não entra nos gates, porque o CI não tem o MuJoCo; o registro está na decisão 0003.
uso: python3 tools/ponte/carregar_mujoco.py <arquivo.mjcf.xml> [passos] [angulo-inicial-em-grau]
"""
import math
import sys

import mujoco


def main():
    caminho = sys.argv[1]
    passos = int(sys.argv[2]) if len(sys.argv) > 2 else 2000
    inicial = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0
    modelo = mujoco.MjModel.from_xml_path(caminho)
    dados = mujoco.MjData(modelo)
    print(f"MuJoCo {mujoco.__version__}: {caminho} carregado")
    print(f"corpos {modelo.nbody} (com o mundo), juntas {modelo.njnt}, massa total {sum(modelo.body_mass):.6f} kg")
    mujoco.mj_forward(modelo, dados)
    for b in range(modelo.nbody):
        nome = mujoco.mj_id2name(modelo, mujoco.mjtObj.mjOBJ_BODY, b) or ""
        if not nome.startswith("conjunto:"):
            continue
        filhos = [c for c in range(modelo.nbody) if modelo.body_parentid[c] == b and not (mujoco.mj_id2name(modelo, mujoco.mjtObj.mjOBJ_BODY, c) or "").startswith("conjunto:")]
        massa = sum(modelo.body_mass[c] for c in filhos)
        centro = [sum(modelo.body_mass[c] * dados.xipos[c][k] for c in filhos) / massa * 1000 for k in range(3)]
        print(f"{nome}: massa {massa * 1000:.1f} g, centro de massa na pose zero [{centro[0]:.1f}, {centro[1]:.1f}, {centro[2]:.1f}] mm")
    for j in range(modelo.njnt):
        dados.qpos[modelo.jnt_qposadr[j]] = math.radians(inicial)
    for passo in range(passos):
        mujoco.mj_step(modelo, dados)
    if any(math.isnan(x) for x in dados.qpos):
        sys.exit("estado virou NaN")
    avisos = sum(aviso.number for aviso in dados.warning)
    print(f"avisos do MuJoCo durante os passos: {avisos}")
    if avisos:
        sys.exit("o MuJoCo avisou durante os passos")
    for j in range(modelo.njnt):
        nome = mujoco.mj_id2name(modelo, mujoco.mjtObj.mjOBJ_JOINT, j)
        print(f"junta {nome}: {math.degrees(dados.qpos[modelo.jnt_qposadr[j]]):.3f} grau após {passos} passos, partindo de {inicial} grau, em passos de {modelo.opt.timestep} s")


if __name__ == "__main__":
    main()
