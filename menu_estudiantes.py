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
        nombre = input('Ingrese el nombre del estudiante: ')
        nota = float(input('Ingrese la nota del estudiante: '))
        estudiantes.append({'nombre': nombre, 'nota': nota})
        print('Estudiante registrado exitosamente')
        
    elif opcion == 2 :
        for estudiante in estudiantes:
            if estudiante:
                print(f"Nombre: {estudiante['nombre']}, Nota: {estudiante['nota']}")
                
    elif opcion == 3 :
        nombre_buscar = input('Ingrese el nombre del estudiante a buscar: ')
        encontrado = False
        for estudiante in estudiantes:
            if estudiante and estudiante['nombre'] == nombre_buscar:
                print(f"Nombre: {estudiante['nombre']}, Nota: {estudiante['nota']}")
                encontrado = True
                break
        if not encontrado:
            print('Estudiante no encontrado')
            
    elif opcion == 4 :
        nombre_actualizar = input('Ingrese el nombre del estudiante a actualizar: ')
        encontrado = False
        for estudiante in estudiantes:
            if estudiante and estudiante['nombre'] == nombre_actualizar:
                nueva_nota = float(input('Ingrese la nueva nota: '))
                estudiante['nota'] = nueva_nota
                print('Nota actualizada exitosamente')
                encontrado = True
                break
        if not encontrado:
            print('Estudiante no encontrado')
            
    elif opcion == 5 :
        nombre_eliminar = input('Ingrese el nombre del estudiante a eliminar: ')
        encontrado = False
        for i, estudiante in enumerate(estudiantes):
            if estudiante and estudiante['nombre'] == nombre_eliminar:
                estudiantes.pop(i)
                print('Estudiante eliminado exitosamente')
                encontrado = True
                break
        if not encontrado:
            print('Estudiante no encontrado')
            
    elif opcion == 6 :
        if len(estudiantes) > 1:
            total_notas = sum(estudiante['nota'] for estudiante in estudiantes if estudiante)
            promedio = total_notas / (len(estudiantes) - 1)
            print(f'El promedio general es: {promedio:.2f}')
        else:
            print('No hay estudiantes registrados para calcular el promedio')
    
    elif opcion == 7 :
        print('Gracias por usar el sistema de gestión de estudiantes')
        break
    
    
    
    
    
    