-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_Experience_Rate_Modify_Sto (modified 2012-04-21T07:53:24.763)
--创建人:向洪
--创建时间:2009-7-10
--说明:修改频道经验倍率
CREATE  PROCEDURE [dbo].[Ddt_Tank_Experience_Rate_Modify_Sto]
 @ServerID int, 
 @Rate decimal(5, 1), 
 @BeginDay DateTime, 
 @EndDay DateTime, 
 @BeginTime DateTime, 
 @EndTime DateTime,  
 @op varchar(50),
 @type int,
 @ouototal varchar(50)='' output
 AS
if( @op='Insert') 
   begin 
     Delete  From Db_Tank.dbo.Rate Where ServerID=@ServerID and type=@type
     INSERT INTO Db_Tank.dbo.Rate(ServerID, Rate, BeginDay, EndDay, BeginTime, EndTime,Type) 
     VALUES(@ServerID, @Rate, @BeginDay, @EndDay, @BeginTime, @EndTime,@type)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
 if( @op!='Insert')
   begin 
     UPDATE Db_Tank.dbo.Rate Set Rate=@Rate, BeginDay=@BeginDay, EndDay=@EndDay, BeginTime=@BeginTime, EndTime=@EndTime 
	 WHERE ServerID=@op and type=@type
     set @ouototal=@op   	
   end

GO
