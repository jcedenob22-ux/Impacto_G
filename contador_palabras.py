frase = "Si no vives para servir, no sirves para vivir"
contador = {}
for palabra in frase.split():
    if palabra in contador:
        contador[palabra] += 1
    else:
        contador[palabra] = 1