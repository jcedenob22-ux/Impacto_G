def registrar_estudiante(estudiantes):
    nombre = input('Ingrese el nombre del estudiante: ')
    nota = float(input('Ingrese la nota del estudiante: '))
    estudiantes.append({'nombre': nombre, 'nota': nota})
    print('Estudiante registrado exitosamente.')
    
def mostrar_estudiantes(estudiantes):
    for estudiante in estudiantes:
        if estudiante:
            print(f"Nombre: {estudiante['nombre']}, Nota: {estudiante['nota']}")
            
def buscar_estudiante(estudiantes):
    nombre_buscar = input('Ingrese el nombre del estudiante a buscar: ')
    encontrado = False
    for estudiante in estudiantes:
        if estudiante and estudiante['nombre'] == nombre_buscar:
            print(f"Nombre: {estudiante['nombre']}, Nota: {estudiante['nota']}")
            encontrado = True
            break
    if not encontrado:
        print('Estudiante no encontrado.')
        
def actualizar_nota(estudiantes):
    nombre_actualizar = input('Ingrese el nombre del estudiante a actualizar: ')
    encontrado = False
    for estudiante in estudiantes:
        if estudiante and estudiante['nombre'] == nombre_actualizar:
            nueva_nota = float(input('Ingrese la nueva nota: '))
            estudiante['nota'] = nueva_nota
            print('Nota actualizada exitosamente.')
            encontrado = True
            break
    if not encontrado:
        print('Estudiante no encontrado.')
        
        
def eliminar_estudiante(estudiantes):
    nombre_eliminar = input('Ingrese el nombre del estudiante a eliminar: ')
    encontrado = False
    for i, estudiante in enumerate(estudiantes):
        if estudiante and estudiante['nombre'] == nombre_eliminar:
            estudiantes.pop(i)
            print('Estudiante eliminado exitosamente.')
            encontrado = True
            break
    if not encontrado:
        print('Estudiante no encontrado.')
        
        
        
def mostrar_promedio(estudiantes):
    if len(estudiantes) == 0:
        print('No hay estudiantes registrados para calcular el promedio.')
        return
    total_notas = sum(estudiante['nota'] for estudiante in estudiantes if estudiante)
    promedio = total_notas / len(estudiantes)
    print(f'El promedio general de los estudiantes es: {promedio:.2f}')
    
estudiantes = [{}]











while True: 
    print('=================================')
    
    print('SISTEMA DE GESTIÓN DE ESTUDIANTES')
    
    print('=================================')
    
    print('1. Registrar estudiante')
    print('2. Mostrar todos los estudiantes')
    print('3. Buscar estudiante')
    print('4. Actualizar nota')
    print('5. Eliminar estudiante')
    print('6. Mostrar promedio general')
    print('7. Salir')
    
    opcion = int(input('Seleccione una opción: '))
    
    if opcion == 1 :
        registrar_estudiante(estudiantes)
        
    elif opcion == 2 :
        mostrar_estudiantes(estudiantes)
        
    elif opcion == 3 :
        buscar_estudiante(estudiantes)
        
    elif opcion == 4 :
        actualizar_nota(estudiantes)
        
    elif opcion == 5 :
        eliminar_estudiante(estudiantes)
        
    elif opcion == 6 :
        mostrar_promedio(estudiantes)
        
    elif opcion == 7 :
        print('Gracias por usar el sistema de gestión de estudiantes.')
        break