"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { ArrowRight, Crown, Medal, Trophy, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface ClientData {
  id: string
  name: string
  revenue: number
  status: "actif" | "inactif" | "en_attente"
}

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} DH`;
}

const getStatusBadge = (status: ClientData["status"]) => {
  switch (status) {
    case "actif":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Actif</Badge>
    case "inactif":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactif</Badge>
    case "en_attente":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">En attente</Badge>
    default:
      return null
  }
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-500" />
    case 2:
      return <Trophy className="h-4 w-4 text-gray-400" />
    case 3:
      return <Medal className="h-4 w-4 text-amber-600" />
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {rank}
        </span>
      )
  }
}

export function TopClients() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/charts')
        const result = await response.json()
        if (result.success) {
          setClients(result.data.topClients)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (clients.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Clients</CardTitle>
          <CardDescription>
            Les 5 clients avec le plus grand chiffre d'affaires
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Aucun client avec des factures payées
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-semibold">Top Clients</CardTitle>
          <CardDescription>
            Les 5 clients avec le plus grand chiffre d'affaires
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-12 px-4 text-center">Rang</TableHead>
              <TableHead className="px-4">Client</TableHead>
              <TableHead className="px-4 text-right">Chiffre d'affaires</TableHead>
              <TableHead className="px-4 text-center">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client, index) => (
              <TableRow
                key={client.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <TableCell className="px-4 text-center">
                  <div className="flex items-center justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                </TableCell>
                <TableCell className="px-4 font-medium">{client.name}</TableCell>
                <TableCell className="px-4 text-right font-mono">
                  {formatCurrency(client.revenue)}
                </TableCell>
                <TableCell className="px-4 text-center">
                  {getStatusBadge(client.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
