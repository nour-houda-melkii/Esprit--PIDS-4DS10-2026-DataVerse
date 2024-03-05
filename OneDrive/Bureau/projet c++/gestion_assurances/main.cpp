#include "gestion_assuranes.h"
#include "assurances.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    gestion_assuranes w;
    w.show();
    return a.exec();
}
