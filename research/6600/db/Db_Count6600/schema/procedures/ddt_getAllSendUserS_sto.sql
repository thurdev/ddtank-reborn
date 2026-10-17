-- SQL_STORED_PROCEDURE dbo.ddt_getAllSendUserS_sto (modified 2012-04-21T07:53:25.107)

CREATE proc [dbo].[ddt_getAllSendUserS_sto]
@userName nvarchar(50)
as
if(@userName='')
begin
select a.receiver 
from db_count.dbo.Ddt_Send a with(nolock) right join db_count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0 group by receiver
end
else
begin
select a.receiver 
from db_count.dbo.Ddt_Send a with(nolock) right join db_count.dbo.Ddt_SendDetail b with(nolock) on (a.sendid=b.sendid) where a.static=0 and a.Sender=@userName group by receiver
end

GO
