#include "gestion_assuranes.h"
#include "ui_gestion_assuranes.h"

gestion_assuranes::gestion_assuranes(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::gestion_assuranes)
{
    ui->setupUi(this);
}

gestion_assuranes::~gestion_assuranes()
{
    delete ui;
}

