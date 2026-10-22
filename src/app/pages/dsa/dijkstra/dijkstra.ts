import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dijkstra',
  templateUrl: './dijkstra.html',
  styleUrls: ['./dijkstra.scss']
})
export class Dijkstra implements OnInit {
  currentStep = 0;

  constructor() { }

  ngOnInit(): void {
  }
}