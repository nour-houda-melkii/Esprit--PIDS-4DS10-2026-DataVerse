#include "gestion_contrat.h"
#include "ui_gestion_contrat.h"

gestion_contrat::gestion_contrat(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::gestion_contrat)
{
    ui->setupUi(this);
}

gestion_contrat::~gestion_contrat()
{
    delete ui;
}

