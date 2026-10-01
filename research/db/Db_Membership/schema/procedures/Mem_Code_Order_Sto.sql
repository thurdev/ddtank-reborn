-- SQL_STORED_PROCEDURE dbo.Mem_Code_Order_Sto (modified 2012-04-21T07:54:31.047)
/*
这个存储过程主要是用来生成各种各样的单号的。传入一个特别码单号来分清他对应的是那一个类型单号的最大值
*/
CREATE         PROCEDURE [dbo].[Mem_Code_Order_Sto] @Code varchar(20) ,@ouototal varchar(50)='' output AS
declare @orderidcard varchar(14)
declare @temp varchar(50)
if (select  left(codenumber,8)  from  Mem_Code where code=@Code)=(select convert(varchar(8),getdate(),112))--如果是同一天
  begin
    UPDATE Mem_Code SET codenumber =codenumber +1 where code=@Code    --在原来的单号上加1
  end
else
  begin
     set @orderidcard=(cast((select convert(varchar(8),getdate(),112))as varchar(50)))+'00001' --生成单的编号
     UPDATE Mem_Code SET codenumber =@orderidcard where code=@Code
  end
 select top 1 @ouototal=codenumber   from (select * from  Mem_Code where code=@Code)   
output
 








GO
