import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { AssignmentService } from '../../../assignments/assignment.service';
import { KeyBoxService } from '../../../key-boxes/key-box.service';
import { ParkingSpaceService } from '../../../parking-spaces/parking-space.service';
import { StayService } from '../../../stays/stays.service';
import { VehicleService } from '../../../vehicle/vehicle.service';

interface DashboardStat {
  title: string;
  value: number;
  description: string;
  icon: string;
  color: string;
}

@Component({
  imports: [DatePipe],
  selector: 'app-dashboard-home',
  styleUrl: './dashboard-home.css',
  templateUrl: './dashboard-home.html',
})
export class DashboardHome {
  constructor(
    private readonly keyBoxService: KeyBoxService,
    private readonly parkingSpaceService: ParkingSpaceService,
    private readonly vehicleService: VehicleService,
    private readonly assignmentService: AssignmentService,
    private readonly stayService: StayService
  ) { }

  get stats(): DashboardStat[] {
    const keyBoxes = this.keyBoxService.getAll();
    const parkingSpaces = this.parkingSpaceService.getAll();
    const vehicles = this.vehicleService.getAll();
    const activeAssignments = this.assignmentService.getActive();

    return [
      {
        title: 'Cajas disponibles',
        value: keyBoxes.filter(box => box.status === 'AVAILABLE').length,
        description: `de ${keyBoxes.length} cajas registradas`,
        icon: '▣',
        color: 'blue'
      },
      {
        title: 'Estacionamientos libres',
        value: parkingSpaces.filter(space => space.status === 'AVAILABLE').length,
        description: `de ${parkingSpaces.length} espacios registrados`,
        icon: '▤',
        color: 'green'
      },
      {
        title: 'Vehículos activos',
        value: vehicles.filter(vehicle => vehicle.status === 'ACTIVE').length,
        description: `de ${vehicles.length} vehículos registrados`,
        icon: '↔',
        color: 'purple'
      },
      {
        title: 'Asignaciones activas',
        value: activeAssignments.length,
        description: 'Vigentes actualmente',
        icon: '◷',
        color: 'orange'
      }
    ];
  }

  get recentStays() {
    return [...this.stayService.getAll()]
      .sort((first, second) =>
        new Date(second.entryAt).getTime() - new Date(first.entryAt).getTime()
      )
      .slice(0, 5);
  }
}
