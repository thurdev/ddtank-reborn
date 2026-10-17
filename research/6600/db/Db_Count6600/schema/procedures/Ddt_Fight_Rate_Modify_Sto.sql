-- SQL_STORED_PROCEDURE dbo.Ddt_Fight_Rate_Modify_Sto (modified 2012-04-21T07:53:24.950)

CREATE  PROCEDURE Ddt_Fight_Rate_Modify_Sto
 @ID int, 
 @ServerID int, 
 @Rate int, 
 @BeginDay DateTime, 
 @EndDay DateTime, 
 @BeginTime DateTime, 
 @EndTime DateTime, 
 @BoyTemplateID int, 
 @GirlTemplateID int, 
 @SelfCue nvarchar(400), 
 @EnemyCue nvarchar(400), 
 @Name nvarchar(100),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS
--创建人:Andy	--创建时间:2009-08-20	--说明:战斗换装表 增加和修改操作
 if( @op='Insert') 
   begin 
     INSERT INTO Db_Tank.dbo.Fight_Rate(ServerID, Rate, BeginDay, EndDay, BeginTime, EndTime, BoyTemplateID, GirlTemplateID, SelfCue, EnemyCue, Name) 
     VALUES(@ServerID, @Rate, @BeginDay, @EndDay, @BeginTime, @EndTime, @BoyTemplateID, @GirlTemplateID, @SelfCue,@EnemyCue, @Name)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
 if( @op!='Insert')
   begin 
     UPDATE Db_Tank.dbo.Fight_Rate Set ServerID=@ServerID, Rate=@Rate, BeginDay=@BeginDay, EndDay=@EndDay, BeginTime=@BeginTime, 
EndTime=@EndTime, BoyTemplateID=@BoyTemplateID, GirlTemplateID=@GirlTemplateID, SelfCue=@SelfCue, EnemyCue=@EnemyCue, Name=@Name 
WHERE (id =@op)
     set @ouototal=@op   	
   end

GO
